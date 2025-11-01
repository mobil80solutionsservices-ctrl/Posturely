/**
 * NeckTiltController - Manages the "Neck Tilt (Up-Down)" exercise
 * Implements initialization, calibration, and up-down tilt detection with audio guidance
 */
export class NeckTiltController {
    constructor(audioManager, poseValidator, calibrationManager) {
        // Core managers
        this.audioManager = audioManager;
        this.poseValidator = poseValidator;
        this.calibrationManager = calibrationManager;
        
        // Exercise state
        this.state = 'idle'; // idle, initialization, calibration, up_tilt, down_tilt, completed, error
        this.baseline = null;
        this.isInitialized = false;
        
        // Exercise parameters
        this.currentRep = 1;
        this.maxReps = 7;
        this.currentPhase = null; // 'up' or 'down'
        
        // Hold timer management
        this.holdTimer = null;
        this.holdDuration = 3000; // 3 seconds hold requirement
        this.detectionInterval = null;
        this.isInCorrectPose = false;
        
        // Exercise results
        this.exerciseResults = {
            startTime: null,
            endTime: null,
            completedReps: 0,
            totalHoldTime: 0,
            completed: false
        };
        
        console.log('🔄 NeckTiltController created');
    }
    
    /**
     * Initialize the exercise controller
     */
    async initialize() {
        try {
            console.log('🔄 Initializing Neck Tilt exercise...');
            
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
            console.log('✅ Neck Tilt exercise initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Neck Tilt exercise:', error);
            this.setState('error');
            throw error;
        }
    }
    
    /**
     * Start the complete exercise sequence
     */
    async startExercise() {
        try {
            console.log('🚀 Starting Neck Tilt (Up-Down) exercise');
            
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
            console.error('❌ Neck Tilt exercise failed:', error);
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
        console.log('🔊 Playing neck tilt instruction audio');
        await this.audioManager.playAudio('neckrotationstarted.mp3');
        
        // Play countdown.mp3 for 3 seconds
        console.log('🔊 Playing countdown audio');
        await this.audioManager.playAudio('countdown.mp3');
        
        console.log('✅ Initialization phase completed');
    }
    
    /**
     * Phase 2: Calibration - capture baseline nose-to-shoulder-center distance
     */
    async calibrationPhase() {
        console.log('📏 Starting calibration phase...');
        this.setState('calibration');
        
        try {
            // Use same baseline measurement as Sit Tall exercise (nose-to-shoulder-center)
            console.log('📊 Capturing baseline nose-to-shoulder distance...');
            
            // Wait a moment for user to stabilize after countdown
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Capture baseline using pose validator
            this.baseline = this.poseValidator.captureNoseToShoulderBaseline();
            
            if (!this.baseline) {
                throw new Error('Failed to capture nose-to-shoulder baseline during calibration');
            }
            
            console.log('✅ Calibration phase completed with baseline:', {
                noseToShoulderDistance: this.baseline.toFixed(4),
                timestamp: new Date().toISOString()
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
            
            // Up tilt phase
            await this.startUpTiltPhase();
            
            if (this.state === 'error') break;
            
            // Down tilt phase  
            await this.startDownTiltPhase();
            
            if (this.state === 'error') break;
            
            // Increment repetition count
            this.currentRep++;
            this.exerciseResults.completedReps++;
        }
        
        console.log('✅ Exercise repetition loop completed');
    }
    
    /**
     * Up tilt phase with audio and detection
     */
    async startUpTiltPhase() {
        console.log(`⬆️ Starting up tilt phase (rep ${this.currentRep})`);
        this.setState('up_tilt');
        this.currentPhase = 'up';
        
        // Play upward tilt instruction audio
        console.log('🔊 Playing upward tilt instruction audio');
        await this.audioManager.playAudio('tiltupwardnew.mp3');
        
        // Enter detection mode for upward tilt
        await this.enterDetectionMode('up');
        
        console.log('✅ Up tilt phase completed');
    }
    
    /**
     * Down tilt phase with audio and detection
     */
    async startDownTiltPhase() {
        console.log(`⬇️ Starting down tilt phase (rep ${this.currentRep})`);
        this.setState('down_tilt');
        this.currentPhase = 'down';
        
        // Play downward tilt instruction audio
        console.log('🔊 Playing downward tilt instruction audio');
        await this.audioManager.playAudio('tiltdown.mp3');
        
        // Enter detection mode for downward tilt
        await this.enterDetectionMode('down');
        
        console.log('✅ Down tilt phase completed');
    }
    
    /**
     * Enter detection mode for pose validation
     */
    async enterDetectionMode(direction) {
        console.log(`👁️ Entering detection mode for ${direction} tilt`);
        
        return new Promise((resolve) => {
            this.isInCorrectPose = false;
            
            // Start pose detection interval
            this.detectionInterval = setInterval(() => {
                try {
                    const currentPose = this.poseValidator.getCurrentPose();
                    
                    if (!currentPose || !currentPose.landmarks) {
                        return; // Skip if no pose data
                    }
                    
                    const isCorrectPose = this.validateTiltDirection(currentPose, direction);
                    
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
     * Validate tilt direction based on nose-to-shoulder distance changes
     */
    validateTiltDirection(currentPose, direction) {
        try {
            const currentDistance = this.poseValidator.getNoseToShoulderDistance(currentPose);
            
            if (!currentDistance || !this.baseline) {
                return false;
            }
            
            // Debug logging
            console.log(`🔍 Tilt validation - Direction: ${direction}`);
            console.log(`📏 Baseline distance: ${this.baseline.toFixed(3)}`);
            console.log(`📏 Current distance: ${currentDistance.toFixed(3)}`);
            
            let isValid = false;
            
            if (direction === 'up') {
                // Upward tilt detection: distance increases when tilting up - very relaxed threshold
                const threshold = this.baseline * 1.005; // 0.5% increase
                isValid = currentDistance > threshold;
                console.log(`⬆️ Up tilt check: ${currentDistance.toFixed(3)} > ${threshold.toFixed(3)} = ${isValid}`);
            } else {
                // Downward tilt detection: distance decreases when tilting down - very relaxed threshold  
                const threshold = this.baseline * 0.995; // 0.5% decrease
                isValid = currentDistance < threshold;
                console.log(`⬇️ Down tilt check: ${currentDistance.toFixed(3)} < ${threshold.toFixed(3)} = ${isValid}`);
            }
            
            return isValid;
        } catch (error) {
            console.warn('⚠️ Tilt validation error:', error.message);
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
        
        console.log(`⏰ Starting 3-second hold timer for ${direction} tilt`);
        const holdStartTime = Date.now();
        
        this.holdTimer = setTimeout(async () => {
            const holdDuration = Date.now() - holdStartTime;
            this.exerciseResults.totalHoldTime += holdDuration;
            
            console.log(`✅ Successfully held ${direction} tilt for 3 seconds`);
            
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
            console.log(`🔊 Playing first-cycle audio for ${direction} tilt`);
            
            if (direction === 'up') {
                // After upward tilt hold, play face forward instruction
                await this.audioManager.playAudio('faceforward.mp3');
            } else {
                // After downward tilt hold, play repeat instruction
                await this.audioManager.playAudio('tiltrepeat.mp3');
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
        console.log('🎉 Completing Neck Tilt exercise');
        
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
        
        console.log('✅ Neck Tilt exercise completed successfully');
    }
    
    /**
     * Show exercise completion message
     */
    showCompletionMessage() {
        const duration = Math.round((this.exerciseResults.endTime - this.exerciseResults.startTime) / 1000);
        const completedReps = this.exerciseResults.completedReps;
        const holdTime = Math.round(this.exerciseResults.totalHoldTime / 1000);
        
        let message = `🎉 Neck Tilt Exercise Completed!\n\n`;
        message += `⏱️ Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}\n`;
        message += `🔄 Repetitions: ${completedReps}/${this.maxReps}\n`;
        message += `⏰ Total Hold Time: ${holdTime}s\n`;
        message += `\n⬆️⬇️ Great job improving your neck flexibility!`;
        
        // Emit completion event for UI
        const event = new CustomEvent('exerciseCompleted', {
            detail: {
                exerciseType: 'neck-tilt',
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
        console.log('⏸️ Pausing Neck Tilt exercise');
        
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
        console.log('▶️ Resuming Neck Tilt exercise');
        
        // Resume audio
        if (this.audioManager) {
            this.audioManager.resumeAll();
        }
        
        // Restart detection if we were in a tilt phase
        if (this.state === 'up_tilt' || this.state === 'down_tilt') {
            await this.enterDetectionMode(this.currentPhase);
        }
    }
    
    /**
     * Stop the exercise
     */
    async stop() {
        console.log('⏹️ Stopping Neck Tilt exercise');
        
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
        console.log('🧹 Cleaning up Neck Tilt exercise resources');
        
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
            
            console.log('✅ Neck Tilt exercise cleanup completed');
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
        
        console.log(`🔄 Neck Tilt state: ${oldState} → ${newState}`);
        
        // Emit state change event
        const event = new CustomEvent('neckTiltStateChange', {
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
}