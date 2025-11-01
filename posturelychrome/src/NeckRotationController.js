/**
 * NeckRotationController - Manages the "Neck Rotation (Left-Right)" exercise
 * Implements initialization, calibration, and left-right turn detection with audio guidance
 */
export class NeckRotationController {
    constructor(audioManager, poseValidator, calibrationManager) {
        // Core managers
        this.audioManager = audioManager;
        this.poseValidator = poseValidator;
        this.calibrationManager = calibrationManager;
        
        // Exercise state
        this.state = 'idle'; // idle, initialization, calibration, left_turn, right_turn, completed, error
        this.baseline = null;
        this.isInitialized = false;
        
        // Exercise parameters
        this.currentRep = 1;
        this.maxReps = 7;
        this.currentPhase = null; // 'left' or 'right'
        
        // Hold timer management
        this.holdTimer = null;
        this.holdDuration = 3000; // 3 seconds hold requirement
        this.detectionInterval = null;
        this.isInCorrectPose = false;
        
        // Device orientation handling
        this.deviceHandler = this.createDeviceHandler();
        
        // Exercise results
        this.exerciseResults = {
            startTime: null,
            endTime: null,
            completedReps: 0,
            totalHoldTime: 0,
            completed: false
        };
        
        console.log('🔄 NeckRotationController created');
    }
    
    /**
     * Initialize the exercise controller
     */
    async initialize() {
        try {
            console.log('🔄 Initializing Neck Rotation exercise...');
            
            // Validate required managers
            if (!this.audioManager || !this.poseValidator || !this.calibrationManager) {
                throw new Error('Required managers not provided');
            }
            
            // Ensure managers are ready
            if (!this.audioManager.isReady()) {
                throw new Error('AudioManager not ready');
            }
            
            if (!this.poseValidator.isReady()) {
                throw new Error('PoseValidator not ready');
            }
            
            if (!this.calibrationManager.isReady()) {
                throw new Error('CalibrationManager not ready');
            }
            
            this.isInitialized = true;
            console.log('✅ Neck Rotation exercise initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Neck Rotation exercise:', error);
            this.setState('error');
            throw error;
        }
    }
    
    /**
     * Start the complete exercise sequence
     */
    async startExercise() {
        try {
            console.log('🚀 Starting Neck Rotation (Left-Right) exercise');
            
            if (!this.isInitialized) {
                throw new Error('Exercise not initialized');
            }
            
            // Reset exercise state
            this.resetExercise();
            
            // Record start time
            this.exerciseResults.startTime = Date.now();
            
            // Start initialization phase
            await this.initializationPhase();
            
            // Start calibration phase
            await this.calibrationPhase();
            
            // Start exercise repetitions
            await this.startExerciseLoop();
            
            // Complete exercise
            await this.completeExercise();
            
        } catch (error) {
            console.error('❌ Neck Rotation exercise failed:', error);
            this.setState('error');
            await this.cleanup();
            throw error;
        }
    }
    
    /**
     * Phase 1: Initialization with audio sequence
     */
    async initializationPhase() {
        console.log('🎵 Starting initialization phase...');
        this.setState('initialization');
        
        // Play neckrotationstarted.mp3 for 5 seconds
        console.log('🔊 Playing neck rotation instruction audio');
        await this.audioManager.playAudio('neckrotationstarted.mp3');
        
        // Play countdown.mp3 for 3 seconds
        console.log('🔊 Playing countdown audio');
        await this.audioManager.playAudio('countdown.mp3');
        
        console.log('✅ Initialization phase completed');
    }
    
    /**
     * Phase 2: Calibration - capture baseline shoulder distances
     */
    async calibrationPhase() {
        console.log('📏 Starting calibration phase...');
        this.setState('calibration');
        
        try {
            // Capture baseline distances from nose to both shoulders
            console.log('📊 Capturing baseline shoulder distances...');
            
            // Wait a moment for user to stabilize after countdown
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Capture baseline using pose validator
            this.baseline = this.poseValidator.captureShoulderBaseline();
            
            if (!this.baseline) {
                throw new Error('Failed to capture shoulder baseline during calibration');
            }
            
            console.log('✅ Calibration phase completed with baseline:', {
                leftShoulder: this.baseline.left?.toFixed(4),
                rightShoulder: this.baseline.right?.toFixed(4),
                timestamp: new Date(this.baseline.timestamp).toISOString()
            });
            
        } catch (error) {
            console.error('❌ Calibration phase failed:', error);
            throw error;
        }
    }
    
    /**
     * Start the main exercise loop with repetitions
     */
    async startExerciseLoop() {
        console.log('🔄 Starting exercise repetition loop...');
        
        while (this.currentRep <= this.maxReps && this.state !== 'error') {
            console.log(`🔄 Starting repetition ${this.currentRep}/${this.maxReps}`);
            
            // Left turn phase
            await this.startLeftTurnPhase();
            
            if (this.state === 'error') break;
            
            // Right turn phase  
            await this.startRightTurnPhase();
            
            if (this.state === 'error') break;
            
            // Increment repetition count
            this.currentRep++;
            this.exerciseResults.completedReps++;
        }
        
        console.log('✅ Exercise repetition loop completed');
    }
    
    /**
     * Left turn phase with audio and detection
     */
    async startLeftTurnPhase() {
        console.log(`👈 Starting left turn phase (rep ${this.currentRep})`);
        this.setState('left_turn');
        this.currentPhase = 'left';
        
        // Play left turn instruction audio
        console.log('🔊 Playing left turn instruction audio');
        await this.audioManager.playAudio('turnlefttillbeep.mp3');
        
        // Enter detection mode for left turn
        await this.enterDetectionMode('left');
        
        console.log('✅ Left turn phase completed');
    }
    
    /**
     * Right turn phase with audio and detection
     */
    async startRightTurnPhase() {
        console.log(`👉 Starting right turn phase (rep ${this.currentRep})`);
        this.setState('right_turn');
        this.currentPhase = 'right';
        
        // Play right turn instruction audio
        console.log('🔊 Playing right turn instruction audio');
        await this.audioManager.playAudio('nowturnright.mp3');
        
        // Enter detection mode for right turn
        await this.enterDetectionMode('right');
        
        console.log('✅ Right turn phase completed');
    }
    
    /**
     * Enter detection mode for pose validation
     */
    async enterDetectionMode(direction) {
        console.log(`👁️ Entering detection mode for ${direction} turn`);
        
        return new Promise((resolve) => {
            this.isInCorrectPose = false;
            
            // Start pose detection interval
            this.detectionInterval = setInterval(() => {
                try {
                    const currentPose = this.poseValidator.getCurrentPose();
                    
                    if (!currentPose || !currentPose.landmarks) {
                        return; // Skip if no pose data
                    }
                    
                    const isCorrectPose = this.validateTurnDirection(currentPose, direction);
                    
                    if (isCorrectPose && !this.isInCorrectPose) {
                        // Entered correct pose
                        this.isInCorrectPose = true;
                        this.startHoldTimer(direction, resolve);
                    } else if (!isCorrectPose && this.isInCorrectPose) {
                        // Exited correct pose
                        this.isInCorrectPose = false;
                        this.resetHoldTimer();
                    }
                    
                } catch (error) {
                    console.warn('⚠️ Pose detection error:', error.message);
                }
            }, 100); // Check every 100ms for responsive detection
        });
    }
    
    /**
     * Validate turn direction based on device type and shoulder distance changes
     */
    validateTurnDirection(currentPose, direction) {
        try {
            const currentDistances = this.poseValidator.getShoulderDistances(currentPose);
            
            if (!currentDistances || !this.baseline) {
                return false;
            }
            
            const threshold = 0.15; // 15% ratio change from baseline - more sensitive detection
            
            // Debug logging
            console.log(`🔍 Turn validation - Direction: ${direction}`);
            console.log(`📏 Baseline - Left: ${this.baseline.left.toFixed(3)}, Right: ${this.baseline.right.toFixed(3)}`);
            console.log(`📏 Current - Left: ${currentDistances.left.toFixed(3)}, Right: ${currentDistances.right.toFixed(3)}`);
            
            let isValid = false;
            
            // Use ratio-based detection for more reliable turn detection
            const baselineRatio = this.baseline.left / this.baseline.right;
            const currentRatio = currentDistances.left / currentDistances.right;
            const ratioChange = (currentRatio - baselineRatio) / baselineRatio;
            
            console.log(`📊 Ratio analysis - Baseline: ${baselineRatio.toFixed(3)}, Current: ${currentRatio.toFixed(3)}, Change: ${(ratioChange * 100).toFixed(1)}%`);
            
            if (direction === 'left') {
                // Left turn: ratio should increase (left becomes relatively larger than right)
                isValid = ratioChange > threshold;
                console.log(`👈 Left turn check: ratio change ${(ratioChange * 100).toFixed(1)}% > ${(threshold * 100)}% = ${isValid}`);
            } else {
                // Right turn: ratio should decrease (right becomes relatively larger than left)
                isValid = ratioChange < -threshold;
                console.log(`👉 Right turn check: ratio change ${(ratioChange * 100).toFixed(1)}% < ${(-threshold * 100)}% = ${isValid}`);
            }
            
            return isValid;
        } catch (error) {
            console.warn('⚠️ Turn validation error:', error.message);
            return false;
        }
    }
    
    /**
     * Start 3-second hold timer
     */
    startHoldTimer(direction, resolveCallback) {
        if (this.holdTimer) {
            return; // Timer already running
        }
        
        console.log(`⏰ Starting 3-second hold timer for ${direction} turn`);
        const holdStartTime = Date.now();
        
        this.holdTimer = setTimeout(async () => {
            const holdDuration = Date.now() - holdStartTime;
            this.exerciseResults.totalHoldTime += holdDuration;
            
            console.log(`✅ Successfully held ${direction} turn for 3 seconds`);
            
            // Play beep to indicate successful hold
            await this.audioManager.playAudio('beep.mp3');
            
            // Handle first-cycle audio
            await this.handleFirstCycleAudio(direction);
            
            // Clear detection interval
            this.clearDetectionMode();
            
            // Resolve the detection promise
            resolveCallback();
        }, this.holdDuration);
    }
    
    /**
     * Reset hold timer when pose is lost
     */
    resetHoldTimer() {
        if (this.holdTimer) {
            console.log('🔄 Resetting hold timer - pose lost');
            clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }
    }
    
    /**
     * Handle first-cycle audio feedback
     */
    async handleFirstCycleAudio(direction) {
        if (this.currentRep === 1) {
            console.log(`🔊 Playing first-cycle audio for ${direction} turn`);
            
            if (direction === 'left') {
                // After left turn hold, play face forward instruction
                await this.audioManager.playAudio('faceforward.mp3');
            } else {
                // After right turn hold, play repeat instruction
                await this.audioManager.playAudio('neckrepeat.mp3');
            }
        }
    }
    
    /**
     * Clear detection mode and cleanup intervals
     */
    clearDetectionMode() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        this.resetHoldTimer();
        this.isInCorrectPose = false;
    }
    
    /**
     * Complete the entire exercise
     */
    async completeExercise() {
        console.log('🎉 Completing Neck Rotation exercise');
        
        this.setState('completed');
        
        // Record end time
        this.exerciseResults.endTime = Date.now();
        this.exerciseResults.completed = true;
        
        // Calculate total exercise duration
        const totalDuration = this.exerciseResults.endTime - this.exerciseResults.startTime;
        
        // Play completion audio
        console.log('🔊 Playing exercise completion audio');
        await this.audioManager.playAudio('welldone.mp3');
        
        // Log exercise results
        console.log('📊 Exercise Results:', {
            duration: `${Math.round(totalDuration / 1000)}s`,
            completedReps: this.exerciseResults.completedReps,
            totalHoldTime: `${Math.round(this.exerciseResults.totalHoldTime / 1000)}s`,
            completed: this.exerciseResults.completed
        });
        
        // Show completion message
        this.showCompletionMessage();
        
        console.log('✅ Neck Rotation exercise completed successfully');
    }
    
    /**
     * Show exercise completion message
     */
    showCompletionMessage() {
        const duration = Math.round((this.exerciseResults.endTime - this.exerciseResults.startTime) / 1000);
        const completedReps = this.exerciseResults.completedReps;
        const holdTime = Math.round(this.exerciseResults.totalHoldTime / 1000);
        
        let message = `🎉 Neck Rotation Exercise Completed!\n\n`;
        message += `⏱️ Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}\n`;
        message += `🔄 Repetitions: ${completedReps}/${this.maxReps}\n`;
        message += `⏰ Total Hold Time: ${holdTime}s\n`;
        message += `\n🔄 Great job improving your neck mobility!`;
        
        // Emit completion event for UI
        const event = new CustomEvent('exerciseCompleted', {
            detail: {
                exerciseType: 'neck-rotation',
                results: this.exerciseResults,
                message: message
            }
        });
        document.dispatchEvent(event);
        
        console.log('📢 Exercise completion message displayed');
    }
    
    /**
     * Pause the exercise
     */
    async pause() {
        console.log('⏸️ Pausing Neck Rotation exercise');
        
        // Clear any active timers and intervals
        this.clearDetectionMode();
        
        // Pause audio
        if (this.audioManager) {
            this.audioManager.pauseAll();
        }
    }
    
    /**
     * Resume the exercise
     */
    async resume() {
        console.log('▶️ Resuming Neck Rotation exercise');
        
        // Resume audio
        if (this.audioManager) {
            this.audioManager.resumeAll();
        }
        
        // Restart detection if we were in a turn phase
        if (this.state === 'left_turn' || this.state === 'right_turn') {
            await this.enterDetectionMode(this.currentPhase);
        }
    }
    
    /**
     * Stop the exercise
     */
    async stop() {
        console.log('⏹️ Stopping Neck Rotation exercise');
        
        await this.cleanup();
        this.setState('idle');
    }
    
    /**
     * Reset exercise state
     */
    resetExercise() {
        console.log('🔄 Resetting exercise state');
        
        this.baseline = null;
        this.currentRep = 1;
        this.currentPhase = null;
        this.isInCorrectPose = false;
        
        // Clear any active timers
        this.clearDetectionMode();
        
        // Reset results
        this.exerciseResults = {
            startTime: null,
            endTime: null,
            completedReps: 0,
            totalHoldTime: 0,
            completed: false
        };
        
        this.setState('idle');
    }
    
    /**
     * Clean up exercise resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Neck Rotation exercise resources');
        
        try {
            // Clear all timers and intervals
            this.clearDetectionMode();
            
            // Stop audio
            if (this.audioManager) {
                this.audioManager.stopAll();
            }
            
            // Stop calibration if active
            if (this.calibrationManager) {
                this.calibrationManager.stop();
            }
            
            console.log('✅ Neck Rotation exercise cleanup completed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
    
    /**
     * Set exercise state and emit events
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        
        console.log(`🔄 Neck Rotation state: ${oldState} → ${newState}`);
        
        // Emit state change event
        const event = new CustomEvent('neckRotationStateChange', {
            detail: {
                oldState: oldState,
                newState: newState,
                currentRep: this.currentRep,
                currentPhase: this.currentPhase,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Get current exercise state
     */
    getState() {
        return {
            state: this.state,
            isInitialized: this.isInitialized,
            hasBaseline: !!this.baseline,
            currentRep: this.currentRep,
            maxReps: this.maxReps,
            currentPhase: this.currentPhase,
            isInCorrectPose: this.isInCorrectPose,
            results: { ...this.exerciseResults }
        };
    }
    
    /**
     * Create device orientation handler for cross-platform compatibility
     */
    createDeviceHandler() {
        return {
            isIOS: () => {
                return /iPad|iPhone|iPod/.test(navigator.userAgent);
            },
            
            isAndroid: () => {
                return /Android/.test(navigator.userAgent);
            },
            
            getCameraOrientation: () => {
                if (this.isIOS()) {
                    return 'standard';
                } else if (this.isAndroid()) {
                    return 'mirrored';
                }
                return 'standard';
            }
        };
    }
}