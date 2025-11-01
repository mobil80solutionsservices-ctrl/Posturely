/**
 * PoseValidationEngine - Real-time pose detection and validation for exercises
 * Handles pose data collection, baseline capture, and distance calculations
 */
export class PoseValidationEngine {
    constructor() {
        this.mediaPipe = null;
        this.currentPose = null;
        this.calibrationData = [];
        this.isRunning = false;
        this.isInitialized = false;
        this.calibrationInterval = null;
        this.poseUpdateInterval = null;
        
        // MediaPipe landmark indices
        this.LANDMARKS = {
            NOSE: 0,
            LEFT_SHOULDER: 11,
            RIGHT_SHOULDER: 12,
            LEFT_HIP: 23,
            RIGHT_HIP: 24
        };
        
        console.log('📊 PoseValidationEngine created');
    }
    
    /**
     * Initialize MediaPipe pose detection
     */
    async initialize() {
        try {
            console.log('🔄 Initializing PoseValidationEngine...');
            
            // Check if MediaPipe is available
            if (typeof window !== 'undefined' && window.mediaPipe) {
                this.mediaPipe = window.mediaPipe;
                console.log('✅ MediaPipe instance found');
            } else {
                console.warn('⚠️ MediaPipe not available, using simulation mode');
            }
            
            this.isInitialized = true;
            console.log('✅ PoseValidationEngine initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize PoseValidationEngine:', error);
            throw error;
        }
    }
    
    /**
     * Start calibration data collection at 50ms intervals
     */
    startCalibration() {
        console.log('📏 Starting calibration data collection...');
        
        // Clear any existing calibration data
        this.calibrationData = [];
        
        // Clear any existing calibration interval
        if (this.calibrationInterval) {
            clearInterval(this.calibrationInterval);
        }
        
        // Start collecting pose data every 50ms
        this.calibrationInterval = setInterval(() => {
            if (this.currentPose && this.currentPose.landmarks) {
                // Store a deep copy of the pose data with timestamp
                const poseSnapshot = {
                    landmarks: this.currentPose.landmarks.map(landmark => ({
                        x: landmark.x,
                        y: landmark.y,
                        z: landmark.z || 0,
                        visibility: landmark.visibility || 1
                    })),
                    timestamp: Date.now()
                };
                this.calibrationData.push(poseSnapshot);
                
                // Log progress every 20 samples (1 second)
                if (this.calibrationData.length % 20 === 0) {
                    console.log(`📊 Calibration samples collected: ${this.calibrationData.length}`);
                }
            }
        }, 50); // Collect every 50ms as required
        
        console.log('✅ Calibration data collection started');
    }
    
    /**
     * Capture baseline measurements from collected calibration data
     */
    captureBaseline() {
        console.log('📸 Capturing baseline measurements...');
        
        // Stop calibration data collection
        if (this.calibrationInterval) {
            clearInterval(this.calibrationInterval);
            this.calibrationInterval = null;
        }
        
        if (this.calibrationData.length === 0) {
            console.warn('⚠️ No calibration data available for baseline');
            return null;
        }
        
        console.log(`📊 Processing ${this.calibrationData.length} calibration samples`);
        
        // Calculate baseline from collected data
        const baseline = this.calculateAverageBaseline(this.calibrationData);
        
        console.log('✅ Baseline captured:', baseline);
        return baseline;
    }
    
    /**
     * Calculate average baseline from calibration data
     */
    calculateAverageBaseline(calibrationData) {
        console.log(`🧮 Calculating baseline from ${calibrationData.length} samples`);
        
        if (calibrationData.length === 0) {
            console.warn('⚠️ No calibration data to process');
            return null;
        }
        
        let totalNoseToShoulder = 0;
        let totalLeftShoulder = 0;
        let totalRightShoulder = 0;
        let validSamples = 0;
        
        // Process each calibration sample
        for (const poseData of calibrationData) {
            try {
                // Calculate distances for this sample
                const noseToShoulderDist = this.getNoseToShoulderDistance(poseData);
                const shoulderDistances = this.getShoulderDistances(poseData);
                
                // Only include valid measurements
                if (noseToShoulderDist > 0 && shoulderDistances.left > 0 && shoulderDistances.right > 0) {
                    totalNoseToShoulder += noseToShoulderDist;
                    totalLeftShoulder += shoulderDistances.left;
                    totalRightShoulder += shoulderDistances.right;
                    validSamples++;
                }
            } catch (error) {
                console.warn('⚠️ Skipping invalid calibration sample:', error.message);
            }
        }
        
        if (validSamples === 0) {
            console.error('❌ No valid calibration samples found');
            return null;
        }
        
        // Calculate averages
        const baseline = {
            noseToShoulderDistance: totalNoseToShoulder / validSamples,
            shoulderDistances: {
                left: totalLeftShoulder / validSamples,
                right: totalRightShoulder / validSamples
            },
            sampleCount: validSamples,
            timestamp: Date.now()
        };
        
        console.log(`✅ Baseline calculated from ${validSamples} valid samples:`, {
            noseToShoulder: baseline.noseToShoulderDistance.toFixed(4),
            leftShoulder: baseline.shoulderDistances.left.toFixed(4),
            rightShoulder: baseline.shoulderDistances.right.toFixed(4)
        });
        
        return baseline;
    }
    
    /**
     * Calculate nose-to-shoulder-center distance for sit-tall and neck-tilt exercises
     */
    getNoseToShoulderDistance(pose) {
        if (!pose || !pose.landmarks) {
            throw new Error('Invalid pose data provided');
        }
        
        const landmarks = pose.landmarks;
        
        // Get required landmarks
        const nose = landmarks[this.LANDMARKS.NOSE];
        const leftShoulder = landmarks[this.LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = landmarks[this.LANDMARKS.RIGHT_SHOULDER];
        
        // Validate landmark visibility
        if (!nose || !leftShoulder || !rightShoulder) {
            throw new Error('Required landmarks not detected');
        }
        
        if (nose.visibility < 0.5 || leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) {
            throw new Error('Landmarks not visible enough for accurate measurement');
        }
        
        // Calculate shoulder center point
        const shoulderCenter = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2,
            z: (leftShoulder.z + rightShoulder.z) / 2 || 0
        };
        
        // Calculate 3D distance from nose to shoulder center
        const distance = Math.sqrt(
            Math.pow(nose.x - shoulderCenter.x, 2) + 
            Math.pow(nose.y - shoulderCenter.y, 2) + 
            Math.pow((nose.z || 0) - shoulderCenter.z, 2)
        );
        
        // Debug logging for tilt distance calculation
        console.log('📐 TILT DISTANCE CALCULATION:');
        console.log(`👃➡️🎯 Nose to shoulder center: ${distance.toFixed(4)}`);
        console.log(`📏 Y-axis difference (nose - center): ${(nose.y - shoulderCenter.y).toFixed(4)}`);
        
        return distance;
    }
    
    /**
     * Get distances to individual shoulders for neck rotation exercise
     */
    getShoulderDistances(pose) {
        if (!pose || !pose.landmarks) {
            throw new Error('Invalid pose data provided');
        }
        
        const landmarks = pose.landmarks;
        
        // Get required landmarks
        const nose = landmarks[this.LANDMARKS.NOSE];
        const leftShoulder = landmarks[this.LANDMARKS.LEFT_SHOULDER];
        const rightShoulder = landmarks[this.LANDMARKS.RIGHT_SHOULDER];
        
        // Validate landmark visibility
        if (!nose || !leftShoulder || !rightShoulder) {
            throw new Error('Required landmarks not detected');
        }
        
        if (nose.visibility < 0.5 || leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) {
            throw new Error('Landmarks not visible enough for accurate measurement');
        }
        
        // Calculate 3D distances to each shoulder
        const leftDistance = Math.sqrt(
            Math.pow(nose.x - leftShoulder.x, 2) + 
            Math.pow(nose.y - leftShoulder.y, 2) + 
            Math.pow((nose.z || 0) - (leftShoulder.z || 0), 2)
        );
        
        const rightDistance = Math.sqrt(
            Math.pow(nose.x - rightShoulder.x, 2) + 
            Math.pow(nose.y - rightShoulder.y, 2) + 
            Math.pow((nose.z || 0) - (rightShoulder.z || 0), 2)
        );
        
        // Debug logging for distance calculations
        console.log('📐 DISTANCE CALCULATION:');
        console.log(`👃➡️👈 Left distance: ${leftDistance.toFixed(4)} (nose to left shoulder)`);
        console.log(`👃➡️👉 Right distance: ${rightDistance.toFixed(4)} (nose to right shoulder)`);
        console.log(`⚖️ Distance ratio (L/R): ${(leftDistance / rightDistance).toFixed(3)}`);
        
        return {
            left: leftDistance,
            right: rightDistance
        };
    }
    
    /**
     * Capture baseline for shoulder measurements (neck rotation exercise)
     */
    captureShoulderBaseline() {
        console.log('📸 Capturing shoulder baseline...');
        
        if (!this.currentPose || !this.currentPose.landmarks) {
            console.warn('⚠️ No current pose available for shoulder baseline');
            return null;
        }
        
        try {
            const landmarks = this.currentPose.landmarks;
            const nose = landmarks[this.LANDMARKS.NOSE];
            const leftShoulder = landmarks[this.LANDMARKS.LEFT_SHOULDER];
            const rightShoulder = landmarks[this.LANDMARKS.RIGHT_SHOULDER];
            
            console.log('🔍 BASELINE CAPTURE - Raw landmark positions:');
            console.log(`👃 Nose: x=${nose.x.toFixed(4)}, y=${nose.y.toFixed(4)}, visibility=${nose.visibility.toFixed(2)}`);
            console.log(`👈 Left Shoulder: x=${leftShoulder.x.toFixed(4)}, y=${leftShoulder.y.toFixed(4)}, visibility=${leftShoulder.visibility.toFixed(2)}`);
            console.log(`👉 Right Shoulder: x=${rightShoulder.x.toFixed(4)}, y=${rightShoulder.y.toFixed(4)}, visibility=${rightShoulder.visibility.toFixed(2)}`);
            
            const shoulderDistances = this.getShoulderDistances(this.currentPose);
            
            const baseline = {
                left: shoulderDistances.left,
                right: shoulderDistances.right,
                timestamp: Date.now()
            };
            
            console.log('✅ BASELINE CAPTURED - Shoulder distances:', {
                left: baseline.left.toFixed(4),
                right: baseline.right.toFixed(4),
                ratio: (baseline.left / baseline.right).toFixed(3)
            });
            
            return baseline;
        } catch (error) {
            console.error('❌ Failed to capture shoulder baseline:', error.message);
            return null;
        }
    }
    
    /**
     * Capture baseline for nose-to-shoulder measurements (neck tilt exercise)
     */
    captureNoseToShoulderBaseline() {
        console.log('📸 Capturing nose-to-shoulder baseline...');
        
        if (!this.currentPose || !this.currentPose.landmarks) {
            console.warn('⚠️ No current pose available for nose-to-shoulder baseline');
            return null;
        }
        
        try {
            const landmarks = this.currentPose.landmarks;
            const nose = landmarks[this.LANDMARKS.NOSE];
            const leftShoulder = landmarks[this.LANDMARKS.LEFT_SHOULDER];
            const rightShoulder = landmarks[this.LANDMARKS.RIGHT_SHOULDER];
            
            console.log('🔍 TILT BASELINE CAPTURE - Raw landmark positions:');
            console.log(`👃 Nose: x=${nose.x.toFixed(4)}, y=${nose.y.toFixed(4)}, visibility=${nose.visibility.toFixed(2)}`);
            console.log(`👈 Left Shoulder: x=${leftShoulder.x.toFixed(4)}, y=${leftShoulder.y.toFixed(4)}, visibility=${leftShoulder.visibility.toFixed(2)}`);
            console.log(`👉 Right Shoulder: x=${rightShoulder.x.toFixed(4)}, y=${rightShoulder.y.toFixed(4)}, visibility=${rightShoulder.visibility.toFixed(2)}`);
            
            // Calculate shoulder center
            const shoulderCenter = {
                x: (leftShoulder.x + rightShoulder.x) / 2,
                y: (leftShoulder.y + rightShoulder.y) / 2,
                z: (leftShoulder.z + rightShoulder.z) / 2 || 0
            };
            console.log(`🎯 Shoulder Center: x=${shoulderCenter.x.toFixed(4)}, y=${shoulderCenter.y.toFixed(4)}`);
            
            const distance = this.getNoseToShoulderDistance(this.currentPose);
            
            console.log('✅ TILT BASELINE CAPTURED - Nose-to-shoulder distance:', distance.toFixed(4));
            
            return distance;
        } catch (error) {
            console.error('❌ Failed to capture nose-to-shoulder baseline:', error.message);
            return null;
        }
    }
    
    /**
     * Update current pose from MediaPipe
     */
    updateCurrentPose(poseResults) {
        this.currentPose = poseResults;
    }
    
    /**
     * Get current pose data
     */
    getCurrentPose() {
        return this.currentPose;
    }
    
    /**
     * Start pose detection
     */
    start() {
        console.log('▶️ Starting pose detection...');
        this.isRunning = true;
        
        // If MediaPipe is not available, start simulation mode
        if (!this.mediaPipe) {
            console.log('🎭 Starting pose simulation mode');
            this.startSimulationMode();
        }
    }
    
    /**
     * Start simulation mode for testing without MediaPipe
     */
    startSimulationMode() {
        // Create simulated pose data for testing
        const createSimulatedPose = () => {
            const landmarks = new Array(33).fill(null).map((_, index) => ({
                x: 0.5 + (Math.random() - 0.5) * 0.1,
                y: 0.5 + (Math.random() - 0.5) * 0.1,
                z: (Math.random() - 0.5) * 0.1,
                visibility: 0.8 + Math.random() * 0.2
            }));
            
            // Set specific landmarks for nose and shoulders
            landmarks[this.LANDMARKS.NOSE] = { x: 0.5, y: 0.3, z: 0, visibility: 0.95 };
            landmarks[this.LANDMARKS.LEFT_SHOULDER] = { x: 0.4, y: 0.5, z: 0, visibility: 0.9 };
            landmarks[this.LANDMARKS.RIGHT_SHOULDER] = { x: 0.6, y: 0.5, z: 0, visibility: 0.9 };
            
            return {
                landmarks: landmarks,
                timestamp: Date.now()
            };
        };
        
        // Update pose data periodically
        this.poseUpdateInterval = setInterval(() => {
            this.updateCurrentPose(createSimulatedPose());
        }, 100);
    }
    
    /**
     * Stop pose detection and cleanup resources
     */
    stop() {
        console.log('⏹️ Stopping pose detection');
        this.isRunning = false;
        
        // Clear all intervals
        if (this.poseUpdateInterval) {
            clearInterval(this.poseUpdateInterval);
            this.poseUpdateInterval = null;
        }
        
        if (this.calibrationInterval) {
            clearInterval(this.calibrationInterval);
            this.calibrationInterval = null;
        }
        
        // Clear pose data
        this.currentPose = null;
        this.calibrationData = [];
        
        console.log('✅ Pose detection stopped and resources cleaned up');
    }
    
    /**
     * Check if pose validation is ready
     */
    isReady() {
        return this.isInitialized;
    }
    
    /**
     * Validate pose for specific exercise requirements
     */
    validatePose(pose, exerciseType, phase) {
        if (!pose || !pose.landmarks) {
            return {
                isValid: false,
                confidence: 0,
                feedback: 'No pose data available'
            };
        }
        
        try {
            // Basic landmark visibility check
            const nose = pose.landmarks[this.LANDMARKS.NOSE];
            const leftShoulder = pose.landmarks[this.LANDMARKS.LEFT_SHOULDER];
            const rightShoulder = pose.landmarks[this.LANDMARKS.RIGHT_SHOULDER];
            
            if (!nose || !leftShoulder || !rightShoulder) {
                return {
                    isValid: false,
                    confidence: 0,
                    feedback: 'Required landmarks not detected'
                };
            }
            
            const minVisibility = 0.5;
            if (nose.visibility < minVisibility || 
                leftShoulder.visibility < minVisibility || 
                rightShoulder.visibility < minVisibility) {
                return {
                    isValid: false,
                    confidence: nose.visibility * leftShoulder.visibility * rightShoulder.visibility,
                    feedback: 'Please position yourself clearly in the camera view'
                };
            }
            
            // Exercise-specific validation can be added here
            const confidence = (nose.visibility + leftShoulder.visibility + rightShoulder.visibility) / 3;
            
            return {
                isValid: true,
                confidence: confidence,
                feedback: 'Pose detected successfully'
            };
            
        } catch (error) {
            console.error('❌ Pose validation error:', error);
            return {
                isValid: false,
                confidence: 0,
                feedback: 'Error validating pose'
            };
        }
    }
    
    /**
     * Get calibration data count
     */
    getCalibrationDataCount() {
        return this.calibrationData.length;
    }
    
    /**
     * Clear calibration data
     */
    clearCalibrationData() {
        this.calibrationData = [];
        console.log('🧹 Calibration data cleared');
    }
}