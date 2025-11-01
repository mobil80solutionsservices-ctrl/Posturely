import { AudioSequenceManager } from './AudioSequenceManager.js';
import { PoseValidationEngine } from './PoseValidationEngine.js';
import { CalibrationManager } from './CalibrationManager.js';
import { SitTallExerciseController } from './SitTallExerciseController.js';
import { NeckRotationController } from './NeckRotationController.js';
import { NeckTiltController } from './NeckTiltController.js';

/**
 * ExerciseOrchestrator - Manages exercise flow and state transitions
 * Coordinates between audio, pose validation, and exercise-specific controllers
 */
export class ExerciseOrchestrator {
    constructor() {
        // Core managers
        this.audioManager = null;
        this.poseValidator = null;
        this.calibrationManager = null;
        
        // Exercise state
        this.currentExercise = null;
        this.currentController = null;
        this.exerciseState = 'idle'; // idle, initializing, running, paused, completed, error
        
        // Resource management
        this.activeResources = new Set();
        this.cleanupCallbacks = [];
        
        console.log('🎯 ExerciseOrchestrator created');
    }
    
    /**
     * Initialize the exercise orchestrator
     */
    async initialize() {
        try {
            console.log('🔄 Initializing ExerciseOrchestrator...');
            
            // Initialize core managers
            console.log('📦 Creating AudioSequenceManager...');
            this.audioManager = new AudioSequenceManager();
            console.log('📦 Creating PoseValidationEngine...');
            this.poseValidator = new PoseValidationEngine();
            
            // Initialize managers in correct order
            console.log('🔄 Initializing AudioManager...');
            await this.audioManager.initialize();
            console.log('✅ AudioManager initialized');
            
            console.log('🔄 Initializing PoseValidator...');
            await this.poseValidator.initialize();
            console.log('✅ PoseValidator initialized');
            
            // Create CalibrationManager with initialized PoseValidationEngine
            console.log('📦 Creating CalibrationManager...');
            this.calibrationManager = new CalibrationManager(this.poseValidator);
            console.log('🔄 Initializing CalibrationManager...');
            await this.calibrationManager.initialize();
            console.log('✅ CalibrationManager initialized');
            
            // Track resources for cleanup
            this.activeResources.add('audioManager');
            this.activeResources.add('poseValidator');
            this.activeResources.add('calibrationManager');
            
            console.log('✅ ExerciseOrchestrator initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize ExerciseOrchestrator:', error);
            this.exerciseState = 'error';
            throw error;
        }
    }
    
    /**
     * Start an exercise session
     */
    async startExercise(exerciseType) {
        try {
            console.log(`🚀 Starting exercise: ${exerciseType}`);
            
            if (this.exerciseState === 'running') {
                throw new Error('Another exercise is already running');
            }
            
            this.exerciseState = 'initializing';
            this.currentExercise = exerciseType;
            
            // Ensure all managers are ready before creating exercise controller
            console.log('🔍 Checking manager states...');
            console.log(`AudioManager: ${this.audioManager ? 'exists' : 'null'}`);
            console.log(`PoseValidator: ${this.poseValidator ? 'exists' : 'null'}`);
            console.log(`CalibrationManager: ${this.calibrationManager ? 'exists' : 'null'}`);
            
            if (!this.audioManager) {
                throw new Error('AudioManager is not initialized');
            }
            if (!this.audioManager.isReady()) {
                console.log('🔄 Ensuring AudioManager is ready...');
                await this.audioManager.ensureReady();
            }
            
            if (!this.poseValidator) {
                throw new Error('PoseValidator is not initialized');
            }
            if (!this.poseValidator.isReady()) {
                console.log('🔄 Re-initializing PoseValidator...');
                await this.poseValidator.initialize();
            }
            
            if (!this.calibrationManager) {
                throw new Error('CalibrationManager is not initialized');
            }
            if (!this.calibrationManager.isReady()) {
                console.log('🔄 Re-initializing CalibrationManager...');
                await this.calibrationManager.initialize();
            }
            
            // Create exercise-specific controller
            this.currentController = this.createExerciseController(exerciseType);
            
            if (!this.currentController) {
                throw new Error(`Unknown exercise type: ${exerciseType}`);
            }
            
            // Initialize the exercise controller
            await this.currentController.initialize();
            
            // Start the exercise
            this.exerciseState = 'running';
            await this.currentController.startExercise();
            
            console.log(`✅ Exercise ${exerciseType} started successfully`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to start exercise ${exerciseType}:`, error);
            this.exerciseState = 'error';
            await this.cleanup();
            throw error;
        }
    }
    
    /**
     * Create exercise-specific controller using factory pattern
     */
    createExerciseController(exerciseType) {
        console.log(`🏭 Creating controller for exercise: ${exerciseType}`);
        
        switch (exerciseType) {
            case 'sit-tall':
                return this.createSitTallController();
            case 'neck-rotation':
                return this.createNeckRotationController();
            case 'neck-tilt':
                return this.createNeckTiltController();
            default:
                console.error(`❌ Unknown exercise type: ${exerciseType}`);
                return null;
        }
    }
    
    /**
     * Create Sit Tall exercise controller
     */
    createSitTallController() {
        console.log('🧘‍♀️ Creating Sit Tall exercise controller');
        
        // Use the existing initialized CalibrationManager
        return new SitTallExerciseController(
            this.audioManager,
            this.poseValidator,
            this.calibrationManager
        );
    }
    
    /**
     * Create Neck Rotation exercise controller
     */
    createNeckRotationController() {
        console.log('🔄 Creating Neck Rotation exercise controller');
        
        // Use the existing initialized CalibrationManager
        return new NeckRotationController(
            this.audioManager,
            this.poseValidator,
            this.calibrationManager
        );
    }
    
    /**
     * Create Neck Tilt exercise controller
     */
    createNeckTiltController() {
        console.log('↕️ Creating Neck Tilt exercise controller');
        
        // Use the existing initialized CalibrationManager
        return new NeckTiltController(
            this.audioManager,
            this.poseValidator,
            this.calibrationManager
        );
    }
    
    /**
     * Simulate exercise for placeholder implementation
     */
    async simulateExercise(exerciseName, duration) {
        console.log(`🎭 Simulating ${exerciseName} for ${duration}ms`);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`✅ ${exerciseName} simulation completed`);
                this.handleExerciseCompletion({
                    exerciseType: this.currentExercise,
                    duration: duration,
                    completed: true,
                    timestamp: Date.now()
                });
                resolve();
            }, duration);
        });
    }
    
    /**
     * Handle exercise state transitions
     */
    handleStateTransition(fromState, toState) {
        console.log(`🔄 Exercise state transition: ${fromState} → ${toState}`);
        
        const validTransitions = {
            'idle': ['initializing'],
            'initializing': ['running', 'error'],
            'running': ['paused', 'completed', 'error'],
            'paused': ['running', 'completed', 'error'],
            'completed': ['idle'],
            'error': ['idle']
        };
        
        if (!validTransitions[fromState]?.includes(toState)) {
            console.warn(`⚠️ Invalid state transition: ${fromState} → ${toState}`);
            return false;
        }
        
        const previousState = this.exerciseState;
        this.exerciseState = toState;
        
        // Emit state change event (for future UI updates)
        this.emitStateChange(previousState, toState);
        
        return true;
    }
    
    /**
     * Emit state change event
     */
    emitStateChange(fromState, toState) {
        const event = new CustomEvent('exerciseStateChange', {
            detail: {
                fromState,
                toState,
                exerciseType: this.currentExercise,
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(event);
    }
    
    /**
     * Pause current exercise
     */
    async pauseExercise() {
        if (this.exerciseState !== 'running') {
            console.warn('⚠️ Cannot pause exercise - not currently running');
            return false;
        }
        
        try {
            console.log('⏸️ Pausing exercise...');
            
            if (this.currentController && this.currentController.pause) {
                await this.currentController.pause();
            }
            
            // Pause audio
            if (this.audioManager) {
                this.audioManager.pauseAll();
            }
            
            this.handleStateTransition('running', 'paused');
            
            console.log('✅ Exercise paused');
            return true;
        } catch (error) {
            console.error('❌ Failed to pause exercise:', error);
            this.handleStateTransition('running', 'error');
            return false;
        }
    }
    
    /**
     * Resume paused exercise
     */
    async resumeExercise() {
        if (this.exerciseState !== 'paused') {
            console.warn('⚠️ Cannot resume exercise - not currently paused');
            return false;
        }
        
        try {
            console.log('▶️ Resuming exercise...');
            
            if (this.currentController && this.currentController.resume) {
                await this.currentController.resume();
            }
            
            // Resume audio
            if (this.audioManager) {
                this.audioManager.resumeAll();
            }
            
            this.handleStateTransition('paused', 'running');
            
            console.log('✅ Exercise resumed');
            return true;
        } catch (error) {
            console.error('❌ Failed to resume exercise:', error);
            this.handleStateTransition('paused', 'error');
            return false;
        }
    }
    
    /**
     * Stop current exercise
     */
    async stopExercise() {
        if (this.exerciseState === 'idle') {
            console.log('ℹ️ No exercise to stop');
            return true;
        }
        
        try {
            console.log('⏹️ Stopping exercise...');
            
            if (this.currentController && this.currentController.stop) {
                await this.currentController.stop();
            }
            
            await this.cleanup();
            
            this.handleStateTransition(this.exerciseState, 'idle');
            
            console.log('✅ Exercise stopped');
            return true;
        } catch (error) {
            console.error('❌ Failed to stop exercise:', error);
            this.exerciseState = 'error';
            return false;
        }
    }
    
    /**
     * Handle exercise completion
     */
    handleExerciseCompletion(results) {
        console.log('🎉 Exercise completed:', results);
        
        this.handleStateTransition(this.exerciseState, 'completed');
        
        // Emit completion event
        const event = new CustomEvent('exerciseCompleted', {
            detail: {
                exerciseType: this.currentExercise,
                results: results,
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(event);
        
        // Clean up after a short delay to allow for completion animations
        setTimeout(() => {
            this.cleanup();
            this.handleStateTransition('completed', 'idle');
        }, 2000);
    }
    
    /**
     * Clean up exercise resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up exercise resources...');
        
        try {
            // Stop current exercise controller
            if (this.currentController && this.currentController.cleanup) {
                await this.currentController.cleanup();
            }
            
            // Stop audio
            if (this.audioManager) {
                this.audioManager.stopAll();
            }
            
            // Stop pose validation
            if (this.poseValidator) {
                this.poseValidator.stop();
            }
            
            // Stop calibration
            if (this.calibrationManager) {
                this.calibrationManager.stop();
            }
            
            // Execute cleanup callbacks
            for (const callback of this.cleanupCallbacks) {
                try {
                    await callback();
                } catch (error) {
                    console.error('❌ Cleanup callback failed:', error);
                }
            }
            
            // Reset state
            this.currentExercise = null;
            this.currentController = null;
            this.cleanupCallbacks = [];
            
            console.log('✅ Exercise resources cleaned up');
        } catch (error) {
            console.error('❌ Failed to cleanup exercise resources:', error);
        }
    }
    
    /**
     * Add cleanup callback
     */
    addCleanupCallback(callback) {
        if (typeof callback === 'function') {
            this.cleanupCallbacks.push(callback);
        }
    }
    
    /**
     * Get current exercise state
     */
    getExerciseState() {
        return {
            state: this.exerciseState,
            exerciseType: this.currentExercise,
            hasActiveController: !!this.currentController,
            activeResources: Array.from(this.activeResources)
        };
    }
    
    /**
     * Check if orchestrator is ready
     */
    isReady() {
        return this.audioManager && this.audioManager.isReady() &&
               this.poseValidator && this.poseValidator.isReady() &&
               this.calibrationManager && this.calibrationManager.isReady() &&
               this.exerciseState !== 'error';
    }
    
    /**
     * Get available exercises
     */
    getAvailableExercises() {
        return [
            {
                id: 'sit-tall',
                name: 'Sit Tall & Breathe',
                description: 'Mindful meditation exercise for posture improvement',
                duration: '3 minutes',
                requirements: ['camera', 'audio']
            },
            {
                id: 'neck-rotation',
                name: 'Neck Rotation (Left-Right)',
                description: 'Improve neck mobility through controlled movements',
                duration: '7 repetitions',
                requirements: ['camera', 'audio']
            },
            {
                id: 'neck-tilt',
                name: 'Neck Tilt (Up-Down)',
                description: 'Enhance vertical neck flexibility',
                duration: '7 repetitions',
                requirements: ['camera', 'audio']
            }
        ];
    }
}