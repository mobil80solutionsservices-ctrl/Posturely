/**
 * SitTallExerciseController - Manages the "Sit Tall & Breathe" meditation exercise
 * Implements initialization, calibration, meditation phases with posture monitoring
 */
export class SitTallExerciseController {
    constructor(audioManager, poseValidator, calibrationManager) {
        // Core managers
        this.audioManager = audioManager;
        this.poseValidator = poseValidator;
        this.calibrationManager = calibrationManager;
        
        // Exercise state
        this.state = 'idle'; // idle, initialization, calibration, stabilization, meditation, correction, completed, error
        this.baseline = null;
        this.isInitialized = false;
        
        // Meditation timer management
        this.meditationDuration = 3 * 60 * 1000; // 3 minutes in milliseconds
        this.meditationStartTime = null;
        this.meditationTimer = null;
        this.meditationPausedTime = 0;
        this.isPaused = false;
        
        // Posture monitoring
        this.postureCheckInterval = null;
        this.correctionStartTime = null;
        this.correctionActive = false;
        this.correctionHandler = null;
        
        // Exercise results
        this.exerciseResults = {
            startTime: null,
            endTime: null,
            totalDeviations: 0,
            totalCorrectionTime: 0,
            completed: false
        };
        
        console.log('🧘‍♀️ SitTallExerciseController created');
    }
    
    /**
     * Initialize the exercise controller
     */
    async initialize() {
        try {
            console.log('🔄 Initializing Sit Tall exercise...');
            
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
            
            // Initialize correction handler
            this.correctionHandler = this.audioManager.createCorrectionHandler();
            
            this.isInitialized = true;
            console.log('✅ Sit Tall exercise initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Sit Tall exercise:', error);
            this.setState('error');
            throw error;
        }
    }
    
    /**
     * Start the complete exercise sequence
     */
    async startExercise() {
        try {
            console.log('🚀 Starting Sit Tall & Breathe exercise');
            
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
            
            // Start stabilization phase
            await this.stabilizationPhase();
            
            // Start meditation phase
            await this.meditationPhase();
            
            // Complete exercise
            await this.completeExercise();
            
        } catch (error) {
            console.error('❌ Sit Tall exercise failed:', error);
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
        
        // Play sittall.mp3 for 5 seconds
        console.log('🔊 Playing sit tall instruction audio');
        await this.audioManager.playAudio('sittall.mp3');
        
        // Play countdown.mp3 for 3 seconds
        console.log('🔊 Playing countdown audio');
        await this.audioManager.playAudio('countdown.mp3');
        
        console.log('✅ Initialization phase completed');
    }
    
    /**
     * Phase 2: Calibration with 50ms pose data collection
     */
    async calibrationPhase() {
        console.log('📏 Starting calibration phase...');
        this.setState('calibration');
        
        try {
            // Start calibration data collection during the audio sequence
            // The audio has already played, so we collect data for a short period
            console.log('📊 Starting pose data collection...');
            
            // Start calibration with the calibration manager
            this.baseline = await this.calibrationManager.startCalibration('sit-tall', 3000);
            
            if (!this.baseline) {
                throw new Error('Failed to capture baseline during calibration');
            }
            
            console.log('✅ Calibration phase completed with baseline:', {
                noseToShoulder: this.baseline.noseToShoulderDistance?.toFixed(4),
                sampleCount: this.baseline.sampleCount,
                confidence: this.baseline.confidence?.toFixed(3)
            });
            
        } catch (error) {
            console.error('❌ Calibration phase failed:', error);
            throw error;
        }
    }
    
    /**
     * Phase 3: Stabilization - 2 second wait after countdown
     */
    async stabilizationPhase() {
        console.log('⏱️ Starting stabilization phase...');
        this.setState('stabilization');
        
        // Wait 2 seconds for user to stabilize position
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ Stabilization phase completed');
    }
    
    /**
     * Phase 4: Meditation with posture monitoring
     */
    async meditationPhase() {
        console.log('🧘‍♀️ Starting meditation phase...');
        this.setState('meditation');
        
        try {
            // Play meditation started audio
            console.log('🔊 Playing meditation started audio');
            await this.audioManager.playAudio('meditationstarted.mp3');
            
            // Start nature sounds loop
            console.log('🌿 Starting nature sounds for meditation');
            this.audioManager.startNatureSoundsLoop();
            
            // Start 3-minute meditation timer
            this.startMeditationTimer();
            
            // Start posture monitoring
            this.startPostureMonitoring();
            
            // Wait for meditation to complete
            await this.waitForMeditationCompletion();
            
            console.log('✅ Meditation phase completed');
            
        } catch (error) {
            console.error('❌ Meditation phase failed:', error);
            throw error;
        }
    }
    
    /**
     * Start 3-minute meditation timer with pause/resume functionality
     */
    startMeditationTimer() {
        console.log('⏰ Starting 3-minute meditation timer');
        
        this.meditationStartTime = Date.now();
        this.meditationPausedTime = 0;
        this.isPaused = false;
        
        // Create timer that accounts for paused time
        const checkTimer = () => {
            if (this.state !== 'meditation' && this.state !== 'correction') {
                return; // Timer stopped
            }
            
            if (!this.isPaused) {
                const elapsed = Date.now() - this.meditationStartTime - this.meditationPausedTime;
                const remaining = this.meditationDuration - elapsed;
                
                if (remaining <= 0) {
                    console.log('⏰ Meditation timer completed');
                    this.completeMeditation();
                    return;
                }
                
                // Log progress every 30 seconds
                if (Math.floor(elapsed / 30000) !== Math.floor((elapsed - 1000) / 30000)) {
                    const minutes = Math.floor(remaining / 60000);
                    const seconds = Math.floor((remaining % 60000) / 1000);
                    console.log(`⏰ Meditation time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`);
                }
            }
            
            // Check again in 1 second
            this.meditationTimer = setTimeout(checkTimer, 1000);
        };
        
        checkTimer();
    }
    
    /**
     * Pause meditation timer during corrections
     */
    pauseTimer() {
        if (!this.isPaused && this.meditationStartTime) {
            console.log('⏸️ Pausing meditation timer for posture correction');
            this.isPaused = true;
            this.pauseStartTime = Date.now();
        }
    }
    
    /**
     * Resume meditation timer after corrections
     */
    resumeTimer() {
        if (this.isPaused && this.pauseStartTime) {
            console.log('▶️ Resuming meditation timer after posture correction');
            this.meditationPausedTime += Date.now() - this.pauseStartTime;
            this.isPaused = false;
            this.pauseStartTime = null;
        }
    }
    
    /**
     * Start real-time posture monitoring every 200ms
     */
    startPostureMonitoring() {
        console.log('👁️ Starting posture monitoring (200ms intervals)');
        
        this.postureCheckInterval = setInterval(() => {
            if (this.state === 'meditation' || this.state === 'correction') {
                this.checkPosture();
            }
        }, 200); // Check every 200ms as required
    }
    
    /**
     * Check current posture against baseline
     */
    checkPosture() {
        try {
            const currentPose = this.poseValidator.getCurrentPose();
            
            if (!currentPose || !currentPose.landmarks || !this.baseline) {
                return; // Skip if no pose data or baseline
            }
            
            // Calculate current nose-to-shoulder distance
            const currentDistance = this.poseValidator.getNoseToShoulderDistance(currentPose);
            
            if (currentDistance <= 0) {
                return; // Skip invalid measurements
            }
            
            // Calculate deviation from baseline
            const deviation = Math.abs(currentDistance - this.baseline.noseToShoulderDistance) / this.baseline.noseToShoulderDistance;
            
            // Check if deviation exceeds threshold (0.05 = 5%)
            if (deviation > 0.05) {
                this.handlePostureDeviation();
            } else {
                this.handleCorrectPosture();
            }
            
        } catch (error) {
            console.warn('⚠️ Posture check failed:', error.message);
        }
    }
    
    /**
     * Handle posture deviation detection
     */
    handlePostureDeviation() {
        if (!this.correctionActive) {
            // Start tracking deviation time
            this.correctionStartTime = Date.now();
            this.correctionActive = true;
            
            // Wait 2 seconds before triggering correction
            setTimeout(() => {
                if (this.correctionActive && this.state === 'meditation') {
                    console.log('🚨 Posture deviation detected - starting correction');
                    this.startPostureCorrection();
                }
            }, 2000);
        }
    }
    
    /**
     * Handle return to correct posture
     */
    handleCorrectPosture() {
        if (this.correctionActive) {
            console.log('✅ Posture corrected - ending correction mode');
            this.correctionActive = false;
            this.correctionStartTime = null;
            
            // End correction if it was active
            if (this.state === 'correction') {
                this.endPostureCorrection();
            }
        }
    }
    
    /**
     * Start posture correction mode
     */
    async startPostureCorrection() {
        console.log('🔄 Starting posture correction mode');
        
        this.setState('correction');
        this.exerciseResults.totalDeviations++;
        
        // Pause meditation timer
        this.pauseTimer();
        
        // Start correction audio using the correction handler
        await this.correctionHandler.startCorrection('correctposture.mp3');
        
        console.log('🔊 Posture correction audio started (looping)');
    }
    
    /**
     * End posture correction mode
     */
    async endPostureCorrection() {
        console.log('🔄 Ending posture correction mode');
        
        // Calculate correction time
        if (this.correctionStartTime) {
            const correctionDuration = Date.now() - this.correctionStartTime;
            this.exerciseResults.totalCorrectionTime += correctionDuration;
        }
        
        // Stop correction audio
        await this.correctionHandler.endCorrection();
        
        // Resume meditation timer
        this.resumeTimer();
        
        // Return to meditation state
        this.setState('meditation');
        
        console.log('✅ Posture correction completed');
    }
    
    /**
     * Wait for meditation completion
     */
    waitForMeditationCompletion() {
        return new Promise((resolve) => {
            this.meditationCompleteCallback = resolve;
        });
    }
    
    /**
     * Complete meditation phase
     */
    completeMeditation() {
        console.log('🏁 Meditation phase completed');
        
        // Stop posture monitoring
        this.stopPostureMonitoring();
        
        // Stop nature sounds
        this.audioManager.stopNatureSounds();
        
        // Clear meditation timer
        if (this.meditationTimer) {
            clearTimeout(this.meditationTimer);
            this.meditationTimer = null;
        }
        
        // Resolve the waiting promise
        if (this.meditationCompleteCallback) {
            this.meditationCompleteCallback();
        }
    }
    
    /**
     * Stop posture monitoring
     */
    stopPostureMonitoring() {
        if (this.postureCheckInterval) {
            clearInterval(this.postureCheckInterval);
            this.postureCheckInterval = null;
            console.log('⏹️ Posture monitoring stopped');
        }
    }
    
    /**
     * Complete the entire exercise
     */
    async completeExercise() {
        console.log('🎉 Completing Sit Tall & Breathe exercise');
        
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
            deviations: this.exerciseResults.totalDeviations,
            correctionTime: `${Math.round(this.exerciseResults.totalCorrectionTime / 1000)}s`,
            completed: this.exerciseResults.completed
        });
        
        // Show completion message
        this.showCompletionMessage();
        
        console.log('✅ Sit Tall & Breathe exercise completed successfully');
    }
    
    /**
     * Show exercise completion message
     */
    showCompletionMessage() {
        const duration = Math.round((this.exerciseResults.endTime - this.exerciseResults.startTime) / 1000);
        const deviations = this.exerciseResults.totalDeviations;
        const correctionTime = Math.round(this.exerciseResults.totalCorrectionTime / 1000);
        
        let message = `🎉 Sit Tall & Breathe Exercise Completed!\n\n`;
        message += `⏱️ Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}\n`;
        message += `📊 Posture Corrections: ${deviations}\n`;
        
        if (correctionTime > 0) {
            message += `⏰ Correction Time: ${correctionTime}s\n`;
        }
        
        message += `\n🧘‍♀️ Great job maintaining your posture during meditation!`;
        
        // Emit completion event for UI
        const event = new CustomEvent('exerciseCompleted', {
            detail: {
                exerciseType: 'sit-tall',
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
        console.log('⏸️ Pausing Sit Tall exercise');
        
        if (this.state === 'meditation') {
            this.pauseTimer();
            this.stopPostureMonitoring();
            this.audioManager.pauseAll();
        }
    }
    
    /**
     * Resume the exercise
     */
    async resume() {
        console.log('▶️ Resuming Sit Tall exercise');
        
        if (this.state === 'meditation') {
            this.resumeTimer();
            this.startPostureMonitoring();
            this.audioManager.resumeAll();
        }
    }
    
    /**
     * Stop the exercise
     */
    async stop() {
        console.log('⏹️ Stopping Sit Tall exercise');
        
        await this.cleanup();
        this.setState('idle');
    }
    
    /**
     * Reset exercise state
     */
    resetExercise() {
        console.log('🔄 Resetting exercise state');
        
        this.baseline = null;
        this.meditationStartTime = null;
        this.meditationPausedTime = 0;
        this.isPaused = false;
        this.correctionActive = false;
        this.correctionStartTime = null;
        
        // Reset results
        this.exerciseResults = {
            startTime: null,
            endTime: null,
            totalDeviations: 0,
            totalCorrectionTime: 0,
            completed: false
        };
        
        this.setState('idle');
    }
    
    /**
     * Clean up exercise resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Sit Tall exercise resources');
        
        try {
            // Stop all timers
            if (this.meditationTimer) {
                clearTimeout(this.meditationTimer);
                this.meditationTimer = null;
            }
            
            // Stop posture monitoring
            this.stopPostureMonitoring();
            
            // Stop audio
            this.audioManager.stopAll();
            
            // End any active correction
            if (this.correctionHandler && this.correctionHandler.isInCorrection()) {
                await this.correctionHandler.endCorrection();
            }
            
            // Stop calibration if active
            if (this.calibrationManager) {
                this.calibrationManager.stop();
            }
            
            console.log('✅ Sit Tall exercise cleanup completed');
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
        
        console.log(`🔄 Sit Tall state: ${oldState} → ${newState}`);
        
        // Emit state change event
        const event = new CustomEvent('sitTallStateChange', {
            detail: {
                oldState: oldState,
                newState: newState,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Get current exercise state
     */
    getState() {
        const meditationProgress = this.getMeditationProgress();
        
        return {
            state: this.state,
            isInitialized: this.isInitialized,
            hasBaseline: !!this.baseline,
            meditationProgress: meditationProgress,
            isPaused: this.isPaused,
            correctionActive: this.correctionActive,
            results: { ...this.exerciseResults }
        };
    }
    
    /**
     * Get meditation progress percentage
     */
    getMeditationProgress() {
        if (!this.meditationStartTime || this.state !== 'meditation') {
            return 0;
        }
        
        const elapsed = Date.now() - this.meditationStartTime - this.meditationPausedTime;
        const progress = Math.min((elapsed / this.meditationDuration) * 100, 100);
        
        return Math.max(0, progress);
    }
    
    /**
     * Get remaining meditation time in seconds
     */
    getRemainingTime() {
        if (!this.meditationStartTime || this.state !== 'meditation') {
            return 0;
        }
        
        const elapsed = Date.now() - this.meditationStartTime - this.meditationPausedTime;
        const remaining = Math.max(0, this.meditationDuration - elapsed);
        
        return Math.floor(remaining / 1000);
    }
}