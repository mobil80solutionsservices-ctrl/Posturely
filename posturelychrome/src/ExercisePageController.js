import { ExerciseOrchestrator } from './ExerciseOrchestrator.js';

/**
 * ExercisePageController - Manages the dedicated exercise page workflow
 * Handles exercise selection, navigation, and orchestration
 */
export class ExercisePageController {
    constructor() {
        this.exerciseOrchestrator = new ExerciseOrchestrator();
        
        // UI state
        this.selectedExercise = null;
        this.elements = {};
        
        // Navigation manager
        this.navigationManager = null;
        
        // Pose detection state (same as ScanPageController)
        this.poseNet = null;
        this.currentPose = null;
        this.isPoseDetectionRunning = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize().catch(console.error));
        } else {
            this.initialize().catch(console.error);
        }
    }
    
    /**
     * Initialize the exercise page controller
     */
    async initialize() {
        console.log('🎯 Initializing ExercisePageController');
        
        // Initialize NavigationManager
        this.navigationManager = new NavigationManager();
        
        // Register cleanup callback for exercise resources
        this.navigationManager.registerCleanupCallback(() => {
            this.cleanup();
        });
        
        // Make this controller available globally for navigation
        window.exercisePageController = this;
        
        // Get UI elements
        this.elements = {
            exerciseCards: document.querySelectorAll('.exercise-card'),
            startExerciseBtn: document.getElementById('startExerciseBtn'),
            backButton: document.getElementById('backButton'),
            exerciseVideo: document.getElementById('exerciseVideo'),
            exerciseCanvas: document.getElementById('exerciseCanvas'),
            exerciseStatusText: document.getElementById('exerciseStatusText'),
            exerciseProgress: document.getElementById('exerciseProgressFill'),
            stopExerciseBtn: document.getElementById('stopExerciseBtn')
        };
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize exercise orchestrator
        try {
            console.log('🔄 Initializing ExerciseOrchestrator from ExercisePageController...');
            await this.exerciseOrchestrator.initialize();
            console.log('✅ ExerciseOrchestrator initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize ExerciseOrchestrator:', error);
            console.error('❌ ExerciseOrchestrator initialization error details:', error.stack);
            // Set a flag to indicate initialization failed
            this.orchestratorInitFailed = true;
            this.orchestratorInitError = error;
        }
        
        console.log('✅ ExercisePageController initialized');
    }
    
    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Exercise card selection
        this.elements.exerciseCards.forEach(card => {
            card.addEventListener('click', () => {
                this.selectExercise(card.dataset.exercise);
            });
        });
        
        // Start exercise button
        this.elements.startExerciseBtn.addEventListener('click', () => {
            this.startSelectedExercise();
        });
        
        // Back to scan button
        this.elements.backToScanBtn.addEventListener('click', () => {
            this.navigateToScan();
        });
        
        // Back button navigation
        this.elements.backButton.addEventListener('click', () => {
            this.navigateToScan();
        });
        
        // Exercise completion handler
        document.addEventListener('exerciseCompleted', (event) => {
            console.log('🎉 Exercise completed event received:', event.detail);
            this.handleExerciseCompletion(event.detail);
        });
    }
    
    /**
     * Select an exercise
     */
    selectExercise(exerciseType) {
        console.log(`🎯 Selecting exercise: ${exerciseType}`);
        
        // Update selected exercise
        this.selectedExercise = exerciseType;
        
        // Update UI - remove selection from all cards
        this.elements.exerciseCards.forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked card
        const selectedCard = document.querySelector(`[data-exercise="${exerciseType}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Enable start button
        this.elements.startExerciseBtn.disabled = false;
        
        // Update button text with exercise name
        const exerciseNames = {
            'sit-tall': 'Start Sit Tall & Breathe',
            'neck-rotation': 'Start Neck Rotation',
            'neck-tilt': 'Start Neck Tilt'
        };
        
        this.elements.startExerciseBtn.textContent = `🚀 ${exerciseNames[exerciseType]}`;
    }
    
    /**
     * Start the selected exercise
     */
    async startSelectedExercise() {
        if (!this.selectedExercise) {
            console.warn('⚠️ No exercise selected');
            return;
        }
        
        try {
            console.log(`🚀 Starting exercise: ${this.selectedExercise}`);
            
            // Check if orchestrator is properly initialized
            if (!this.exerciseOrchestrator) {
                throw new Error('ExerciseOrchestrator is not initialized');
            }
            
            if (this.orchestratorInitFailed) {
                console.error('❌ ExerciseOrchestrator initialization had failed earlier:', this.orchestratorInitError);
                console.log('🔄 Attempting to re-initialize ExerciseOrchestrator...');
                
                // Try to re-initialize
                this.exerciseOrchestrator = new ExerciseOrchestrator();
                await this.exerciseOrchestrator.initialize();
                this.orchestratorInitFailed = false;
                console.log('✅ ExerciseOrchestrator re-initialized successfully');
            }
            
            // Double-check that orchestrator is ready
            if (!this.exerciseOrchestrator.isReady()) {
                console.log('⚠️ ExerciseOrchestrator not ready, attempting re-initialization...');
                await this.exerciseOrchestrator.initialize();
            }
            
            // Show camera UI immediately (like scan page)
            this.showExerciseExecution();
            this.updateExerciseStatus('Initializing camera...', 'loading');
            
            // Setup camera and MediaPipe first
            await this.setupExerciseEnvironment();
            
            this.updateExerciseStatus('Camera ready. Starting exercise...', 'ready');
            
            // Start the exercise through orchestrator
            await this.exerciseOrchestrator.startExercise(this.selectedExercise);
            
            console.log('✅ Exercise started successfully');
        } catch (error) {
            console.error('❌ Failed to start exercise:', error);
            
            // Show error in exercise UI if it's visible, otherwise reset
            const exerciseExecution = document.getElementById('exerciseExecution');
            if (exerciseExecution && !exerciseExecution.classList.contains('hidden')) {
                this.updateExerciseStatus(`Failed to start exercise: ${error.message}`, 'error');
            } else {
                // Reset UI on error if exercise UI not shown
                this.resetStartButton();
                alert(`Failed to start exercise: ${error.message}`);
            }
        }
    }
    
    /**
     * Reset the start button to its default state
     */
    resetStartButton() {
        if (this.selectedExercise) {
            const exerciseNames = {
                'sit-tall': 'Start Sit Tall & Breathe',
                'neck-rotation': 'Start Neck Rotation',
                'neck-tilt': 'Start Neck Tilt'
            };
            
            this.elements.startExerciseBtn.disabled = false;
            this.elements.startExerciseBtn.textContent = `🚀 ${exerciseNames[this.selectedExercise]}`;
        } else {
            this.elements.startExerciseBtn.disabled = true;
            this.elements.startExerciseBtn.textContent = '🚀 Start Exercise';
        }
    }
    
    /**
     * Handle exercise completion
     */
    handleExerciseCompletion(results) {
        console.log('🎉 Exercise completed:', results);
        
        // Reset UI
        this.resetStartButton();
        
        // Show completion message
        this.showCompletionMessage(results);
    }
    
    /**
     * Show exercise completion message
     */
    showCompletionMessage(results) {
        // Create a simple completion overlay (you could make this more sophisticated)
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--bg);
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            max-width: 400px;
            margin: 20px;
        `;
        
        content.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
            <h2 style="color: var(--text); margin: 0 0 16px 0;">Exercise Complete!</h2>
            <p style="color: var(--subtext); margin: 0 0 24px 0;">
                Great job! You've successfully completed the exercise.
            </p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: var(--accent); color: var(--buttonPrimaryText); 
                           border: none; border-radius: 8px; padding: 12px 24px; 
                           font-weight: 600; cursor: pointer;">
                Continue
            </button>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    }
    
    /**
     * Navigate to scan page
     */
    navigateToScan() {
        console.log('📊 Navigating to scan page');
        
        // Clean up any running exercises
        this.exerciseOrchestrator.cleanup();
        
        // Use NavigationManager for proper navigation
        if (this.navigationManager) {
            this.navigationManager.navigateTo('scan');
        } else {
            // Fallback
            const scanUrl = chrome.runtime.getURL('scan.html');
            window.location.href = scanUrl;
        }
    }
    
    /**
     * Cleanup resources for navigation
     */
    cleanup() {
        console.log('🧹 Cleaning up ExercisePageController resources');
        
        // Stop pose detection
        this.stopPoseDetection();
        
        // Clean up exercise orchestrator
        if (this.exerciseOrchestrator) {
            this.exerciseOrchestrator.cleanup();
        }
        
        // Clear selected exercise
        this.selectedExercise = null;
        
        console.log('✅ ExercisePageController cleanup complete');
    }
    
    /**
     * Setup camera and MediaPipe for exercise execution
     */
    async setupExerciseEnvironment() {
        console.log('🎥 Setting up exercise environment...');
        
        try {
            // Get video and canvas elements
            const video = document.getElementById('exerciseVideo');
            const canvas = document.getElementById('exerciseCanvas');
            
            if (!video || !canvas) {
                throw new Error('Exercise video elements not found');
            }
            
            // Setup camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            video.srcObject = stream;
            
            // Wait for video to load
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;
                    resolve();
                };
            });
            
            // Initialize MediaPipe for the exercise orchestrator
            await this.initializeMediaPipe(video);
            
            // Start pose detection loop
            this.startPoseDetection(video);
            
            console.log('✅ Exercise environment setup complete');
        } catch (error) {
            console.error('❌ Failed to setup exercise environment:', error);
            throw new Error(`Camera setup failed: ${error.message}`);
        }
    }
    
    /**
     * Initialize MediaPipe for pose detection
     */
    async initializeMediaPipe(video) {
        try {
            console.log('🔄 Initializing MediaPipe for exercises...');
            
            // Dynamically import the ES module from the extension package
            const visionBundleUrl = chrome.runtime.getURL('mediapipe/vision_bundle.mjs');
            const tv = await import(visionBundleUrl);
            
            if (!tv || !tv.FilesetResolver || !tv.PoseLandmarker) {
                throw new Error('MediaPipe Tasks Vision bundle not loaded');
            }
            const wasmRoot = chrome.runtime.getURL('mediapipe/wasm');
            const modelPath = chrome.runtime.getURL('mediapipe/models/pose_landmarker_lite.task');
            
            const vision = await tv.FilesetResolver.forVisionTasks(wasmRoot);
            const landmarker = await tv.PoseLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: modelPath },
                runningMode: 'VIDEO',
                numPoses: 1,
                minPoseDetectionConfidence: 0.5,
                minPosePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            // Adapt landmarker API to our estimateSinglePose(video) contract (same as ScanPageController)
            this.poseNet = {
                estimateSinglePose: async (video) => {
                    const startTimeMs = performance.now();
                    const result = landmarker.detectForVideo(video, startTimeMs);
                    const lm = (result && result.landmarks && result.landmarks[0]) || [];
                    
                    // Convert to keypoints array compatible with our drawing/scoring code
                    const keypoints = lm.map((p, idx) => ({
                        part: this.mediapipeIndexToPart(idx),
                        position: { 
                            x: p.x * (video.videoWidth || 640), 
                            y: p.y * (video.videoHeight || 480) 
                        },
                        score: p.visibility ?? 1
                    }));
                    
                    // For exercises, also include landmarks for PoseValidationEngine
                    const landmarks = lm.map(p => ({
                        x: p.x,
                        y: p.y,
                        z: p.z || 0,
                        visibility: p.visibility || 1
                    }));
                    
                    return { 
                        keypoints,
                        landmarks  // Added for exercise validation
                    };
                }
            };
            
            // Also make it available globally for backward compatibility
            window.mediaPipe = this.poseNet;
            
            console.log('✅ MediaPipe initialized for exercises');
        } catch (error) {
            console.error('❌ MediaPipe initialization failed:', error);
            console.warn('⚠️ MediaPipe not available, exercises will use simulation mode');
            // Create simulation mode pose detection
            this.createSimulationPoseNet();
        }
    }
    
    /**
     * Create simulation mode pose detection for testing
     */
    createSimulationPoseNet() {
        console.log('🎭 Creating simulation mode pose detection...');
        
        this.poseNet = {
            estimateSinglePose: async (video) => {
                // Generate simulated pose data
                const simulatedLandmarks = this.generateSimulatedPose();
                
                console.log(`🎭 Simulation: Generated ${simulatedLandmarks.length} landmarks`);
                
                return {
                    keypoints: simulatedLandmarks.map((p, idx) => ({
                        part: this.mediapipeIndexToPart(idx),
                        position: { 
                            x: p.x * (video.videoWidth || 640), 
                            y: p.y * (video.videoHeight || 480) 
                        },
                        score: p.visibility || 1
                    })),
                    landmarks: simulatedLandmarks
                };
            }
        };
        
        // Make it available globally
        window.mediaPipe = this.poseNet;
        console.log('✅ Simulation mode pose detection ready');
    }
    
    /**
     * Generate simulated pose landmarks for testing (33 landmarks like MediaPipe)
     */
    generateSimulatedPose() {
        // Generate a basic upright pose with slight random variation
        const baseTime = Date.now() / 1000;
        const variation = Math.sin(baseTime) * 0.02; // Small movement simulation
        
        // Create 33 landmarks array (MediaPipe standard)
        const landmarks = Array(33).fill(null).map((_, i) => ({
            x: 0.5, y: 0.5, z: 0, visibility: 0.5
        }));
        
        // Set key landmarks with proper positions
        landmarks[0] = { x: 0.5 + variation, y: 0.2, z: 0, visibility: 1 }; // Nose
        landmarks[2] = { x: 0.48, y: 0.18, z: 0, visibility: 1 }; // Left eye
        landmarks[5] = { x: 0.52, y: 0.18, z: 0, visibility: 1 }; // Right eye
        landmarks[7] = { x: 0.45, y: 0.2, z: 0, visibility: 1 }; // Left ear
        landmarks[8] = { x: 0.55, y: 0.2, z: 0, visibility: 1 }; // Right ear
        landmarks[11] = { x: 0.4 + variation * 0.5, y: 0.35, z: 0, visibility: 1 }; // Left shoulder
        landmarks[12] = { x: 0.6 + variation * 0.5, y: 0.35, z: 0, visibility: 1 }; // Right shoulder
        landmarks[13] = { x: 0.35, y: 0.5, z: 0, visibility: 1 }; // Left elbow
        landmarks[14] = { x: 0.65, y: 0.5, z: 0, visibility: 1 }; // Right elbow
        landmarks[15] = { x: 0.3, y: 0.65, z: 0, visibility: 1 }; // Left wrist
        landmarks[16] = { x: 0.7, y: 0.65, z: 0, visibility: 1 }; // Right wrist
        landmarks[23] = { x: 0.45, y: 0.7, z: 0, visibility: 1 }; // Left hip
        landmarks[24] = { x: 0.55, y: 0.7, z: 0, visibility: 1 }; // Right hip
        landmarks[25] = { x: 0.43, y: 0.85, z: 0, visibility: 1 }; // Left knee
        landmarks[26] = { x: 0.57, y: 0.85, z: 0, visibility: 1 }; // Right knee
        landmarks[27] = { x: 0.41, y: 1.0, z: 0, visibility: 1 }; // Left ankle
        landmarks[28] = { x: 0.59, y: 1.0, z: 0, visibility: 1 }; // Right ankle
        
        return landmarks;
    }
    
    /**
     * Start pose detection loop
     */
    startPoseDetection(video) {
        if (!video) {
            console.error('❌ No video element provided for pose detection');
            return;
        }
        
        console.log('🔄 Starting pose detection loop...');
        this.isPoseDetectionRunning = true;
        
        const detectPose = async () => {
            if (this.isPoseDetectionRunning && video.readyState >= 2) {
                try {
                    const pose = await this.poseNet.estimateSinglePose(video);
                    this.currentPose = pose;  // Store current pose like ScanPageController
                    
                    // Update pose validation engine if available
                    if (pose && this.exerciseOrchestrator && this.exerciseOrchestrator.poseValidator) {
                        this.exerciseOrchestrator.poseValidator.updateCurrentPose(pose);
                    }
                    
                    // Draw pose on canvas (same as ScanPageController)
                    this.drawPose(pose);
                    
                } catch (error) {
                    console.error('❌ Pose detection error:', error);
                }
            }
            
            if (this.isPoseDetectionRunning) {
                requestAnimationFrame(detectPose);
            }
        };
        
        // Start the detection loop
        requestAnimationFrame(detectPose);
        console.log('✅ Pose detection loop started');
    }
    
    /**
     * Stop pose detection
     */
    stopPoseDetection() {
        console.log('⏹️ Stopping pose detection...');
        this.isPoseDetectionRunning = false;
        
        if (this.poseDetectionInterval) {
            clearInterval(this.poseDetectionInterval);
            this.poseDetectionInterval = null;
        }
    }
    
    /**
     * Draw pose landmarks on canvas (same as ScanPageController)
     */
    drawPose(pose) {
        const canvas = document.getElementById('exerciseCanvas');
        if (!canvas || !pose || !pose.keypoints) return;
        
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw keypoints
        pose.keypoints.forEach(keypoint => {
            if (keypoint.score > 0.3) {
                ctx.beginPath();
                ctx.arc(keypoint.position.x, keypoint.position.y, 4, 0, 2 * Math.PI);
                ctx.fillStyle = '#FED867';
                ctx.fill();
            }
        });
        
        // Draw connections between keypoints
        this.drawConnections(pose.keypoints, ctx);
    }
    
    /**
     * Draw connections between pose landmarks (same as ScanPageController)
     */
    drawConnections(keypoints, ctx) {
        const connections = [
            ['leftShoulder', 'rightShoulder'],
            ['leftShoulder', 'leftElbow'],
            ['leftElbow', 'leftWrist'],
            ['rightShoulder', 'rightElbow'],
            ['rightElbow', 'rightWrist'],
            ['leftShoulder', 'leftHip'],
            ['rightShoulder', 'rightHip'],
            ['leftHip', 'rightHip'],
            ['leftHip', 'leftKnee'],
            ['leftKnee', 'leftAnkle'],
            ['rightHip', 'rightKnee'],
            ['rightKnee', 'rightAnkle']
        ];
        
        ctx.strokeStyle = '#FED867';
        ctx.lineWidth = 2;
        
        connections.forEach(([partA, partB]) => {
            const pointA = keypoints.find(kp => kp.part === partA);
            const pointB = keypoints.find(kp => kp.part === partB);
            
            if (pointA && pointB && pointA.score > 0.3 && pointB.score > 0.3) {
                ctx.beginPath();
                ctx.moveTo(pointA.position.x, pointA.position.y);
                ctx.lineTo(pointB.position.x, pointB.position.y);
                ctx.stroke();
            }
        });
    }
    
    /**
     * Map MediaPipe landmark indices to body part names (same as ScanPageController)
     */
    mediapipeIndexToPart(index) {
        const map = {
            0: 'nose',
            2: 'leftEye',
            5: 'rightEye',
            7: 'leftEar',
            8: 'rightEar',
            11: 'leftShoulder',
            12: 'rightShoulder',
            13: 'leftElbow',
            14: 'rightElbow',
            15: 'leftWrist',
            16: 'rightWrist',
            23: 'leftHip',
            24: 'rightHip',
            25: 'leftKnee',
            26: 'rightKnee',
            27: 'leftAnkle',
            28: 'rightAnkle'
        };
        return map[index] || '';
    }
    
    /**
     * Show exercise execution UI and hide selection UI
     */
    showExerciseExecution() {
        // Hide all exercise selection content
        const exercisesContent = document.querySelector('.exercises-content');
        if (exercisesContent) {
            exercisesContent.classList.add('hidden');
        }
        
        // Show exercise execution
        const exerciseExecution = document.getElementById('exerciseExecution');
        if (exerciseExecution) {
            exerciseExecution.classList.remove('hidden');
        }
        
        // Update exercise title
        const exerciseTitle = document.getElementById('exerciseTitle');
        if (exerciseTitle) {
            const exerciseNames = {
                'sit-tall': 'Sit Tall & Breathe',
                'neck-rotation': 'Neck Rotation (Left-Right)',
                'neck-tilt': 'Neck Tilt (Up-Down)'
            };
            exerciseTitle.textContent = exerciseNames[this.selectedExercise] || 'Exercise in Progress';
        }
        
        // Setup stop button (only add listener once)
        const stopBtn = document.getElementById('stopExerciseBtn');
        if (stopBtn && !stopBtn.hasAttribute('data-listener-added')) {
            stopBtn.addEventListener('click', () => this.stopExercise());
            stopBtn.setAttribute('data-listener-added', 'true');
        }
    }
    
    /**
     * Update exercise status display
     */
    updateExerciseStatus(message, type = 'info') {
        const statusElement = document.getElementById('exerciseStatusText');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-text status-${type}`;
        }
    }
    
    /**
     * Stop current exercise and return to selection
     */
    async stopExercise() {
        try {
            console.log('⏹️ Stopping exercise...');
            
            // Stop pose detection
            this.stopPoseDetection();
            
            // Stop the exercise
            if (this.exerciseOrchestrator) {
                await this.exerciseOrchestrator.stopExercise();
            }
            
            // Stop camera
            const video = document.getElementById('exerciseVideo');
            if (video && video.srcObject) {
                const tracks = video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                video.srcObject = null;
            }
            
            // Return to selection UI
            this.showExerciseSelection();
            
            console.log('✅ Exercise stopped');
        } catch (error) {
            console.error('❌ Failed to stop exercise:', error);
        }
    }
    
    /**
     * Show exercise selection UI and hide execution UI
     */
    showExerciseSelection() {
        // Show exercise selection content
        const exercisesContent = document.querySelector('.exercises-content');
        if (exercisesContent) {
            exercisesContent.classList.remove('hidden');
        }
        
        // Hide exercise execution
        const exerciseExecution = document.getElementById('exerciseExecution');
        if (exerciseExecution) {
            exerciseExecution.classList.add('hidden');
        }
        
        // Reset start button
        this.resetStartButton();
    }
    
    /**
     * Pause current exercise session
     */
    pause() {
        if (this.exerciseOrchestrator) {
            this.exerciseOrchestrator.pauseExercise();
        }
    }
    
    /**
     * Resume current exercise session
     */
    resume() {
        if (this.exerciseOrchestrator) {
            this.exerciseOrchestrator.resumeExercise();
        }
    }
    
    /**
     * Navigate back to main extension
     */
    navigateToMain() {
        console.log('🔙 Navigating back to main extension');
        
        // Clean up any running exercises
        this.exerciseOrchestrator.cleanup();
        
        // Close current tab and return to sidepanel
        window.close();
    }
    
    /**
     * Display exercise options
     */
    displayExerciseOptions() {
        // This method is called by the design but the options are already 
        // displayed in the HTML, so this is mainly for future extensibility
        console.log('📋 Exercise options displayed');
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
                type: 'meditation'
            },
            {
                id: 'neck-rotation',
                name: 'Neck Rotation (Left-Right)',
                description: 'Improve neck mobility through controlled movements',
                duration: '7 repetitions',
                type: 'mobility'
            },
            {
                id: 'neck-tilt',
                name: 'Neck Tilt (Up-Down)',
                description: 'Enhance vertical neck flexibility',
                duration: '7 repetitions',
                type: 'flexibility'
            }
        ];
    }
    
    /**
     * Handle exercise completion and automatically stop the session
     */
    async handleExerciseCompletion(completionData) {
        console.log('🎉 Handling exercise completion:', completionData);
        
        try {
            // Wait a moment for completion animations/audio
            setTimeout(async () => {
                console.log('⏹️ Auto-stopping exercise after completion...');
                
                // Stop the exercise session
                await this.stopExercise();
                
                // Show completion message briefly, then return to exercise selection
                setTimeout(() => {
                    this.showExerciseSelection();
                    console.log('✅ Returned to exercise selection after completion');
                }, 3000); // Show completion for 3 seconds
                
            }, 2000); // Wait 2 seconds for completion audio/animations
            
        } catch (error) {
            console.error('❌ Error handling exercise completion:', error);
        }
    }
}

// Initialize the exercise page controller
new ExercisePageController();