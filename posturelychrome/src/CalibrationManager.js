/**
 * CalibrationManager - Manages baseline pose capture and calibration
 * Handles calibration phase management with timing controls and validation
 */
export class CalibrationManager {
    constructor(poseValidationEngine) {
        this.poseValidationEngine = poseValidationEngine;
        this.calibrationState = 'idle'; // idle, collecting, processing, completed, error
        this.calibrationData = [];
        this.baseline = null;
        this.calibrationDuration = 3000; // 3 seconds default
        this.isInitialized = false;
        
        // Timing controls
        this.calibrationStartTime = null;
        this.calibrationTimer = null;
        this.progressUpdateInterval = null;
        
        // Visual feedback callbacks
        this.onProgressUpdate = null;
        this.onStateChange = null;
        this.onError = null;
        
        // Calibration requirements
        this.minSamples = 30; // Minimum samples for valid calibration
        this.maxSamples = 200; // Maximum samples to prevent memory issues
        
        console.log('📏 CalibrationManager created');
    }
    
    /**
     * Initialize calibration manager
     */
    async initialize() {
        try {
            console.log('🔄 Initializing CalibrationManager...');
            
            // Validate pose validation engine
            if (!this.poseValidationEngine) {
                throw new Error('PoseValidationEngine is required');
            }
            
            // Ensure pose validation engine is initialized
            if (!this.poseValidationEngine.isReady()) {
                await this.poseValidationEngine.initialize();
            }
            
            this.isInitialized = true;
            console.log('✅ CalibrationManager initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize CalibrationManager:', error);
            this.setState('error');
            throw error;
        }
    }
    
    /**
     * Start calibration phase with timing controls
     */
    async startCalibration(exerciseType, duration = 3000) {
        try {
            console.log(`📏 Starting calibration for ${exerciseType}...`);
            
            if (!this.isInitialized) {
                throw new Error('CalibrationManager not initialized');
            }
            
            // Reset previous calibration
            this.reset();
            
            // Set calibration parameters
            this.exerciseType = exerciseType;
            this.calibrationDuration = duration;
            this.calibrationStartTime = Date.now();
            
            // Start calibration data collection
            this.setState('collecting');
            this.poseValidationEngine.startCalibration();
            
            // Start progress updates
            this.startProgressUpdates();
            
            // Set calibration timer
            return new Promise((resolve, reject) => {
                this.calibrationTimer = setTimeout(async () => {
                    try {
                        await this.completeCalibration();
                        resolve(this.baseline);
                    } catch (error) {
                        reject(error);
                    }
                }, duration);
            });
            
        } catch (error) {
            console.error('❌ Calibration failed:', error);
            this.setState('error');
            this.triggerError(error.message);
            throw error;
        }
    }
    
    /**
     * Complete calibration and process data
     */
    async completeCalibration() {
        console.log('🏁 Completing calibration...');
        
        this.setState('processing');
        
        // Stop data collection
        this.stopProgressUpdates();
        
        // Get calibration data from pose validation engine
        const baseline = this.poseValidationEngine.captureBaseline();
        
        if (!baseline) {
            throw new Error('Failed to capture baseline - insufficient data');
        }
        
        // Process and validate the baseline
        this.baseline = this.processCalibrationData(baseline);
        
        // Validate calibration quality
        const validation = this.validateCalibration();
        if (!validation.isValid) {
            throw new Error(`Calibration validation failed: ${validation.reason}`);
        }
        
        this.setState('completed');
        console.log('✅ Calibration completed successfully');
        
        return this.baseline;
    }
    
    /**
     * Process calibration data and calculate enhanced baseline
     */
    processCalibrationData(rawBaseline) {
        console.log('🧮 Processing calibration data...');
        
        if (!rawBaseline) {
            throw new Error('No baseline data to process');
        }
        
        // Enhance baseline with exercise-specific data
        const processedBaseline = {
            exerciseType: this.exerciseType,
            noseToShoulderDistance: rawBaseline.noseToShoulderDistance,
            shoulderDistances: rawBaseline.shoulderDistances,
            sampleCount: rawBaseline.sampleCount,
            confidence: this.calculateConfidence(rawBaseline),
            timestamp: Date.now(),
            calibrationDuration: Date.now() - this.calibrationStartTime
        };
        
        // Add exercise-specific measurements
        if (this.exerciseType === 'sit-tall' || this.exerciseType === 'neck-tilt') {
            processedBaseline.primaryMeasurement = rawBaseline.noseToShoulderDistance;
        } else if (this.exerciseType === 'neck-rotation') {
            processedBaseline.primaryMeasurement = rawBaseline.shoulderDistances;
        }
        
        console.log('✅ Baseline processed:', {
            exerciseType: processedBaseline.exerciseType,
            sampleCount: processedBaseline.sampleCount,
            confidence: processedBaseline.confidence.toFixed(3)
        });
        
        return processedBaseline;
    }
    
    /**
     * Get current baseline
     */
    getBaseline() {
        return this.baseline;
    }
    
    /**
     * Validate calibration quality with error handling
     */
    validateCalibration() {
        console.log('🔍 Validating calibration quality...');
        
        if (!this.baseline) {
            return {
                isValid: false,
                reason: 'No baseline data available',
                confidence: 0
            };
        }
        
        // Check sample count
        if (this.baseline.sampleCount < this.minSamples) {
            return {
                isValid: false,
                reason: `Insufficient samples: ${this.baseline.sampleCount} < ${this.minSamples}`,
                confidence: 0
            };
        }
        
        // Check confidence level
        if (this.baseline.confidence < 0.6) {
            return {
                isValid: false,
                reason: `Low confidence: ${this.baseline.confidence.toFixed(3)} < 0.6`,
                confidence: this.baseline.confidence
            };
        }
        
        // Exercise-specific validation
        const exerciseValidation = this.validateExerciseSpecific();
        if (!exerciseValidation.isValid) {
            return exerciseValidation;
        }
        
        console.log('✅ Calibration validation passed');
        return {
            isValid: true,
            reason: 'Calibration quality is excellent',
            confidence: this.baseline.confidence
        };
    }
    
    /**
     * Validate exercise-specific requirements
     */
    validateExerciseSpecific() {
        const baseline = this.baseline;
        
        switch (this.exerciseType) {
            case 'sit-tall':
            case 'neck-tilt':
                if (!baseline.noseToShoulderDistance || baseline.noseToShoulderDistance <= 0) {
                    return {
                        isValid: false,
                        reason: 'Invalid nose-to-shoulder distance measurement',
                        confidence: 0
                    };
                }
                break;
                
            case 'neck-rotation':
                if (!baseline.shoulderDistances || 
                    baseline.shoulderDistances.left <= 0 || 
                    baseline.shoulderDistances.right <= 0) {
                    return {
                        isValid: false,
                        reason: 'Invalid shoulder distance measurements',
                        confidence: 0
                    };
                }
                break;
        }
        
        return { isValid: true, reason: 'Exercise-specific validation passed', confidence: baseline.confidence };
    }
    
    /**
     * Calculate confidence score from baseline data
     */
    calculateConfidence(baseline) {
        let confidence = 0.5; // Base confidence
        
        // Sample count factor
        const sampleFactor = Math.min(baseline.sampleCount / 60, 1.0) * 0.3;
        confidence += sampleFactor;
        
        // Measurement validity factor
        if (baseline.noseToShoulderDistance > 0) confidence += 0.1;
        if (baseline.shoulderDistances && baseline.shoulderDistances.left > 0 && baseline.shoulderDistances.right > 0) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }
    
    /**
     * Reset calibration data and state
     */
    reset() {
        console.log('🔄 Resetting calibration');
        
        // Clear timers
        this.stop();
        
        // Reset state
        this.setState('idle');
        this.calibrationData = [];
        this.baseline = null;
        this.exerciseType = null;
        this.calibrationStartTime = null;
        
        // Clear pose validation engine calibration data
        if (this.poseValidationEngine) {
            this.poseValidationEngine.clearCalibrationData();
        }
    }
    
    /**
     * Stop calibration process and cleanup
     */
    stop() {
        console.log('⏹️ Stopping calibration');
        
        // Clear all timers
        if (this.calibrationTimer) {
            clearTimeout(this.calibrationTimer);
            this.calibrationTimer = null;
        }
        
        this.stopProgressUpdates();
        
        // Stop pose validation engine calibration
        if (this.poseValidationEngine && this.calibrationState === 'collecting') {
            // Don't clear data, just stop collection
            if (this.poseValidationEngine.calibrationInterval) {
                clearInterval(this.poseValidationEngine.calibrationInterval);
                this.poseValidationEngine.calibrationInterval = null;
            }
        }
        
        if (this.calibrationState === 'collecting') {
            this.setState('idle');
        }
    }
    
    /**
     * Get calibration progress with visual feedback
     */
    getProgress() {
        if (this.calibrationState === 'idle') {
            return 0;
        } else if (this.calibrationState === 'completed') {
            return 100;
        } else if (this.calibrationState === 'processing') {
            return 95;
        } else if (this.calibrationState === 'collecting') {
            // Calculate progress based on time elapsed
            if (!this.calibrationStartTime) return 0;
            
            const elapsed = Date.now() - this.calibrationStartTime;
            const progress = Math.min((elapsed / this.calibrationDuration) * 90, 90);
            return progress;
        }
        
        return 0;
    }
    
    /**
     * Start progress updates for visual feedback
     */
    startProgressUpdates() {
        this.stopProgressUpdates(); // Clear any existing interval
        
        this.progressUpdateInterval = setInterval(() => {
            const progress = this.getProgress();
            const sampleCount = this.poseValidationEngine ? this.poseValidationEngine.getCalibrationDataCount() : 0;
            
            if (this.onProgressUpdate) {
                this.onProgressUpdate({
                    progress: progress,
                    sampleCount: sampleCount,
                    state: this.calibrationState,
                    timeRemaining: this.getTimeRemaining()
                });
            }
        }, 100); // Update every 100ms for smooth progress
    }
    
    /**
     * Stop progress updates
     */
    stopProgressUpdates() {
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
            this.progressUpdateInterval = null;
        }
    }
    
    /**
     * Get remaining calibration time
     */
    getTimeRemaining() {
        if (!this.calibrationStartTime || this.calibrationState !== 'collecting') {
            return 0;
        }
        
        const elapsed = Date.now() - this.calibrationStartTime;
        return Math.max(0, this.calibrationDuration - elapsed);
    }
    
    /**
     * Get detailed calibration state
     */
    getState() {
        const sampleCount = this.poseValidationEngine ? this.poseValidationEngine.getCalibrationDataCount() : 0;
        
        return {
            state: this.calibrationState,
            progress: this.getProgress(),
            hasBaseline: !!this.baseline,
            sampleCount: sampleCount,
            exerciseType: this.exerciseType,
            timeRemaining: this.getTimeRemaining(),
            isReady: this.isReady(),
            confidence: this.baseline ? this.baseline.confidence : 0
        };
    }
    
    /**
     * Set calibration state and trigger callbacks
     */
    setState(newState) {
        const oldState = this.calibrationState;
        this.calibrationState = newState;
        
        console.log(`📊 Calibration state: ${oldState} → ${newState}`);
        
        if (this.onStateChange) {
            this.onStateChange({
                oldState: oldState,
                newState: newState,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Trigger error callback
     */
    triggerError(message) {
        if (this.onError) {
            this.onError({
                message: message,
                timestamp: Date.now(),
                state: this.calibrationState
            });
        }
    }
    
    /**
     * Check if calibration manager is ready
     */
    isReady() {
        return this.isInitialized;
    }
    
    /**
     * Set visual feedback callbacks
     */
    setCallbacks({ onProgressUpdate, onStateChange, onError }) {
        this.onProgressUpdate = onProgressUpdate;
        this.onStateChange = onStateChange;
        this.onError = onError;
        
        console.log('📞 Calibration callbacks configured');
    }
    
    /**
     * Get visual feedback for UI
     */
    getVisualFeedback() {
        const state = this.getState();
        
        let message = '';
        let color = '#666';
        
        switch (state.state) {
            case 'idle':
                message = 'Ready to start calibration';
                color = '#666';
                break;
            case 'collecting':
                message = `Calibrating... ${Math.round(state.timeRemaining / 1000)}s remaining`;
                color = '#2196F3';
                break;
            case 'processing':
                message = 'Processing calibration data...';
                color = '#FF9800';
                break;
            case 'completed':
                message = `Calibration complete! Confidence: ${(state.confidence * 100).toFixed(1)}%`;
                color = '#4CAF50';
                break;
            case 'error':
                message = 'Calibration failed - please try again';
                color = '#F44336';
                break;
        }
        
        return {
            message: message,
            color: color,
            progress: state.progress,
            sampleCount: state.sampleCount,
            showProgress: state.state === 'collecting' || state.state === 'processing'
        };
    }
    
    /**
     * Get calibration requirements for specific exercise
     */
    getCalibrationRequirements(exerciseType) {
        const requirements = {
            'sit-tall': {
                duration: 3000,
                measurements: ['noseToShoulderDistance'],
                instructions: 'Sit up straight and look forward'
            },
            'neck-rotation': {
                duration: 3000,
                measurements: ['shoulderDistances'],
                instructions: 'Face forward with neutral head position'
            },
            'neck-tilt': {
                duration: 3000,
                measurements: ['noseToShoulderDistance'],
                instructions: 'Keep head in neutral position'
            }
        };
        
        return requirements[exerciseType] || requirements['sit-tall'];
    }
}