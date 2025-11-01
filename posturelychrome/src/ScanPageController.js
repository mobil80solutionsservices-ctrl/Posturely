import { EnhancedPostureAnalyzer } from './EnhancedPostureAnalyzer.js';
import { AIReportGenerator } from './AIReportGenerator.js';
import { AudioSequenceManager } from './AudioSequenceManager.js';
import { LocalizationService } from './LocalizationService.js';

/**
 * ScanPageController - Manages the dedicated full body scan page workflow
 * Handles camera initialization, MediaPipe integration, and scan execution
 */
export class ScanPageController {
    constructor() {
        this.postureAnalyzer = new EnhancedPostureAnalyzer();
        this.aiReportGenerator = new AIReportGenerator();
        this.audioManager = new AudioSequenceManager();
        this.localizationService = new LocalizationService();
        
        // MediaPipe and camera state
        this.poseNet = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isScanning = false;
        this.currentPose = null;
        
        // Auto-detection state
        this.autoDetectionEnabled = true;
        this.fullBodyDetectedTime = null;
        this.detectionStabilityDuration = 2000; // 2 seconds of stable detection
        this.isCountingDown = false;
        this.capturePhase = 'front'; // 'front' or 'side'
        this.frontCaptured = false;
        this.sideCaptured = false;
        
        // Audio service
        this.countdownService = null;
        
        // UI elements
        this.elements = {};
        
        // Navigation manager
        this.navigationManager = null;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    /**
     * Initialize the scan page controller
     */
    async initialize() {
        console.log('🎯 Initializing ScanPageController');
        
        // Initialize NavigationManager
        this.navigationManager = new NavigationManager();
        
        // Register cleanup callback for camera resources
        this.navigationManager.registerCleanupCallback(() => {
            this.cleanup();
        });
        
        // Make this controller available globally for navigation
        window.scanPageController = this;
        
        // Get UI elements
        this.elements = {
            video: document.getElementById('scanVideo'),
            canvas: document.getElementById('scanCanvas'),
            startScanBtn: document.getElementById('startScanBtn'),
            captureScanBtn: document.getElementById('captureScanBtn'),
            retakeScanBtn: document.getElementById('retakeScanBtn'),
            countdownOverlay: document.getElementById('countdownOverlay'),
            countdownValue: document.getElementById('countdownValue'),
            scanStatus: document.getElementById('scanStatus'),
            scanResults: document.getElementById('scanResults'),
            resultsContent: document.getElementById('resultsContent'),
            exercisesButton: document.getElementById('exercisesButton')
        };
        
        this.video = this.elements.video;
        this.canvas = this.elements.canvas;
        this.ctx = this.canvas.getContext('2d');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize MediaPipe
        await this.initializePoseDetection();
        
        // Initialize AI report generator
        await this.aiReportGenerator.initialize();
        
        // Initialize localization service
        await this.localizationService.initialize();
        
        // Translate the scan page interface
        await this.translateScanInterface();
        
        // Set up language change listener
        document.addEventListener('languageChanged', async (event) => {
            await this.handleLanguageChange(event.detail.language);
        });
        
        console.log('✅ ScanPageController initialized');
    }
    
    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Start scan button
        this.elements.startScanBtn.addEventListener('click', () => {
            this.startScan();
        });
        
        // Capture scan button
        this.elements.captureScanBtn.addEventListener('click', () => {
            this.captureScan();
        });
        
        // Retake scan button
        this.elements.retakeScanBtn.addEventListener('click', () => {
            this.retakeScan();
        });
        
        // Exercises button
        this.elements.exercisesButton.addEventListener('click', () => {
            this.navigateToExercises();
        });
    }
    
    /**
     * Initialize MediaPipe pose detection
     */
    async initializePoseDetection() {
        try {
            console.log('🔄 Initializing MediaPipe pose detection...');
            
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
            
            // Adapt landmarker API to our estimateSinglePose(video) contract
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
                    
                    return { keypoints };
                }
            };
            
            console.log('✅ MediaPipe PoseLandmarker initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize pose detection:', error);
            this.showStatus('Failed to initialize pose detection. Please refresh the page.', 'error');
            return false;
        }
    }
    
    /**
     * Map MediaPipe landmark indices to body part names
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
     * Start the scanning process
     */
    async startScan() {
        try {
            console.log('🎯 Starting scan process...');
            
            this.showStatus('Initializing camera...', 'loading');
            
            // Initialize camera
            await this.setupCamera();
            
            // Start pose detection loop
            this.startPoseDetection();
            
            // Update UI
            this.elements.startScanBtn.classList.add('hidden');
            this.elements.captureScanBtn.classList.remove('hidden');
            this.elements.retakeScanBtn.classList.remove('hidden');
            
            this.showStatus('Position yourself for full body capture', 'waiting');
            
            // Reset auto-detection state
            this.autoDetectionEnabled = true;
            this.fullBodyDetectedTime = null;
            this.isCountingDown = false;
            this.capturePhase = 'front';
            this.frontCaptured = false;
            this.sideCaptured = false;
            
            console.log('✅ Scan process started');
        } catch (error) {
            console.error('❌ Failed to start scan:', error);
            this.showStatus('Failed to access camera. Please check permissions.', 'error');
        }
    }
    
    /**
     * Set up camera access
     */
    async setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    // Set canvas dimensions to match video
                    this.canvas.width = this.video.videoWidth || 640;
                    this.canvas.height = this.video.videoHeight || 480;
                    resolve();
                };
            });
        } catch (error) {
            throw new Error(`Camera access failed: ${error.message}`);
        }
    }
    
    /**
     * Start pose detection loop
     */
    startPoseDetection() {
        if (!this.poseNet || !this.video) return;
        
        const detectPose = async () => {
            if (this.isScanning && this.video.readyState >= 2) {
                try {
                    const pose = await this.poseNet.estimateSinglePose(this.video);
                    this.currentPose = pose;
                    this.drawPose(pose);
                    
                    // Handle auto-detection for full body scan
                    await this.handleAutoDetection(pose);
                } catch (error) {
                    console.error('Pose detection error:', error);
                }
            }
            
            if (this.isScanning) {
                requestAnimationFrame(detectPose);
            }
        };
        
        this.isScanning = true;
        detectPose();
    }
    
    /**
     * Draw pose landmarks on canvas
     */
    drawPose(pose) {
        if (!this.ctx || !pose || !pose.keypoints) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw keypoints
        pose.keypoints.forEach(keypoint => {
            if (keypoint.score > 0.3) {
                this.ctx.beginPath();
                this.ctx.arc(keypoint.position.x, keypoint.position.y, 4, 0, 2 * Math.PI);
                this.ctx.fillStyle = '#FED867';
                this.ctx.fill();
            }
        });
        
        // Draw connections between keypoints
        this.drawConnections(pose.keypoints);
    }
    
    /**
     * Draw connections between pose landmarks
     */
    drawConnections(keypoints) {
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
        
        this.ctx.strokeStyle = '#FED867';
        this.ctx.lineWidth = 2;
        
        connections.forEach(([partA, partB]) => {
            const pointA = keypoints.find(kp => kp.part === partA);
            const pointB = keypoints.find(kp => kp.part === partB);
            
            if (pointA && pointB && pointA.score > 0.3 && pointB.score > 0.3) {
                this.ctx.beginPath();
                this.ctx.moveTo(pointA.position.x, pointA.position.y);
                this.ctx.lineTo(pointB.position.x, pointB.position.y);
                this.ctx.stroke();
            }
        });
    }
    
    /**
     * Check if full body is visible and stable in frame
     */
    isFullBodyVisible(pose) {
        if (!pose || !pose.keypoints) return false;
        
        // Key body parts that must be visible for full body scan
        const requiredParts = [
            'nose', 'leftShoulder', 'rightShoulder', 
            'leftHip', 'rightHip', 'leftKnee', 'rightKnee',
            'leftAnkle', 'rightAnkle'
        ];
        
        const visibleParts = requiredParts.filter(part => {
            const keypoint = pose.keypoints.find(kp => kp.part === part);
            return keypoint && keypoint.score > 0.5; // Higher confidence threshold
        });
        
        const visibilityRatio = visibleParts.length / requiredParts.length;
        const isFullBodyVisible = visibilityRatio >= 0.8; // 80% of key parts visible
        
        console.log(`👁️ Full body visibility: ${(visibilityRatio * 100).toFixed(1)}% (${visibleParts.length}/${requiredParts.length})`);
        
        return isFullBodyVisible;
    }
    
    /**
     * Handle auto-detection and countdown logic
     */
    async handleAutoDetection(pose) {
        if (!this.autoDetectionEnabled || this.isCountingDown) return;
        
        const isFullBodyVisible = this.isFullBodyVisible(pose);
        
        if (isFullBodyVisible) {
            if (!this.fullBodyDetectedTime) {
                this.fullBodyDetectedTime = Date.now();
                this.showStatus('Full body detected! Hold position...', 'ready');
                console.log('👤 Full body detected, starting stability timer');
            } else {
                const stableTime = Date.now() - this.fullBodyDetectedTime;
                const remainingTime = Math.max(0, this.detectionStabilityDuration - stableTime);
                
                if (remainingTime > 0) {
                    this.showStatus(`Hold position... ${Math.ceil(remainingTime / 1000)}s`, 'ready');
                } else {
                    // Stable detection achieved, start countdown
                    await this.startAutoCaptureSequence();
                }
            }
        } else {
            // Reset detection timer if body not fully visible
            if (this.fullBodyDetectedTime) {
                this.fullBodyDetectedTime = null;
                this.showStatus('Position yourself for full body capture', 'waiting');
                console.log('👤 Full body lost, resetting detection timer');
            }
        }
    }
    
    /**
     * Start the automatic capture sequence with countdown
     */
    async startAutoCaptureSequence() {
        this.isCountingDown = true;
        this.autoDetectionEnabled = false;
        
        if (this.capturePhase === 'front') {
            this.showStatus('Front capture starting...', 'countdown');
            await this.performCountdownCapture('front');
            
            // Play turn to side audio and prepare for side capture
            await this.playTurnToSideAudio();
            this.capturePhase = 'side';
            this.autoDetectionEnabled = true;
            this.fullBodyDetectedTime = null;
            this.isCountingDown = false;
            
        } else if (this.capturePhase === 'side') {
            this.showStatus('Side capture starting...', 'countdown');
            await this.performCountdownCapture('side');
            
            // Both captures complete
            await this.completeScanSequence();
        }
    }
    
    /**
     * Perform countdown and capture for specified angle
     */
    async performCountdownCapture(angle) {
        console.log(`📸 Starting ${angle} capture countdown`);
        
        // 3-2-1 countdown
        for (let i = 3; i >= 1; i--) {
            const captureText = angle === 'front' ? 'FRONT CAPTURE' : 'SIDE CAPTURE';
            this.showStatus(`${captureText}: ${i}`, 'countdown');
            
            // Play countdown beep (same as exercise tracking)
            await this.audioManager.playAudio('beep.mp3');
            
            await this.delay(1000);
        }
        
        // Capture
        const capturingText = angle === 'front' ? 'Capturing front...' : 'Capturing side...';
        this.showStatus(capturingText, 'capturing');
        
        // Play final beep
        await this.audioManager.playAudio('beep.mp3');
        await this.captureAngle(angle);
        
        console.log(`✅ ${angle} capture completed`);
    }
    
    /**
     * Play turn to side audio instruction
     */
    async playTurnToSideAudio() {
        try {
            this.showStatus('Please turn to your side', 'instruction');
            
            // Play the turntoside.mp3 audio
            const audio = new Audio(chrome.runtime.getURL('audio/turntoside.mp3'));
            audio.volume = 1.0;
            
            return new Promise((resolve) => {
                audio.onended = () => {
                    console.log('🔊 Turn to side audio completed');
                    resolve();
                };
                audio.onerror = () => {
                    console.warn('⚠️ Turn to side audio failed, continuing...');
                    resolve();
                };
                audio.play().catch(console.warn);
            });
        } catch (error) {
            console.warn('⚠️ Audio playback error:', error);
        }
    }
    
    /**
     * Capture specific angle (front or side)
     */
    async captureAngle(angle) {
        if (!this.currentPose) return;
        
        try {
            // Capture the frame
            const imageData = this.captureFrame();
            
            // Store the capture
            if (angle === 'front') {
                this.frontCaptured = true;
                this.frontImageData = imageData;
                this.frontPoseData = { ...this.currentPose };
            } else {
                this.sideCaptured = true;
                this.sideImageData = imageData;
                this.sidePoseData = { ...this.currentPose };
            }
            
            console.log(`✅ ${angle} angle captured successfully`);
        } catch (error) {
            console.error(`❌ Failed to capture ${angle} angle:`, error);
        }
    }
    
    /**
     * Complete the full scan sequence
     */
    async completeScanSequence() {
        this.showStatus('Scan complete! Generating report...', 'processing');
        
        // Process both captures and get results
        const analysisResults = await this.processBothCaptures();
        
        if (analysisResults) {
            // Save scan results to history
            await this.saveScanToHistory(analysisResults);
            
            // Display the analysis results and score
            this.displayResults(analysisResults.combinedMetrics, analysisResults.aiReport);
            this.showStatus('Analysis complete! Check your posture report below.', 'success');
            
            // Stop camera after successful scan
            this.stopCamera();
        } else {
            this.showStatus('Scan completed successfully!', 'success');
            // Stop camera even if analysis failed
            this.stopCamera();
        }
        
        console.log('🎉 Full body scan sequence completed');
    }
    
    /**
     * Process both front and side captures
     */
    async processBothCaptures() {
        if (!this.frontCaptured || !this.sideCaptured) {
            console.warn('⚠️ Missing captures - Front:', this.frontCaptured, 'Side:', this.sideCaptured);
            return null;
        }
        
        try {
            // Analyze both poses using the same method as single capture
            const frontAnalysis = await this.postureAnalyzer.analyzePosture(this.frontPoseData);
            const sideAnalysis = await this.postureAnalyzer.analyzePosture(this.sidePoseData);
            
            // Combine front and side analysis for comprehensive metrics
            const combinedMetrics = this.combineAnalysisResults(frontAnalysis, sideAnalysis);
            
            // Generate comprehensive report
            const reportData = {
                front: {
                    analysis: frontAnalysis,
                    image: this.frontImageData,
                    pose: this.frontPoseData
                },
                side: {
                    analysis: sideAnalysis,
                    image: this.sideImageData,
                    pose: this.sidePoseData
                },
                combined: combinedMetrics,
                timestamp: Date.now()
            };
            
            // Generate AI report
            const aiReport = await this.aiReportGenerator.generateReport(reportData);
            
            console.log('📊 Multi-angle analysis completed');
            console.log('📈 Combined metrics:', combinedMetrics);
            
            return {
                combinedMetrics,
                aiReport,
                frontAnalysis,
                sideAnalysis
            };
        } catch (error) {
            console.error('❌ Failed to process captures:', error);
            return null;
        }
    }
    

    
    /**
     * Combine front and side analysis results into comprehensive metrics
     */
    combineAnalysisResults(frontAnalysis, sideAnalysis) {
        // Use front view for lateral measurements, side view for sagittal measurements
        const combinedMetrics = {
            // From front view (better for lateral assessment)
            shoulderTilt: frontAnalysis.shoulderTilt || 0,
            hipTilt: frontAnalysis.hipTilt || 0,
            
            // From side view (better for forward head posture)
            neckTilt: sideAnalysis.neckTilt || frontAnalysis.neckTilt || 0,
            forwardHeadPosture: sideAnalysis.forwardHeadPosture || 0,
            
            // Combined posture score (average of both views)
            postureScore: Math.round(((frontAnalysis.postureScore || 0) + (sideAnalysis.postureScore || 0)) / 2),
            
            // Additional metrics
            overallAlignment: this.calculateOverallAlignment(frontAnalysis, sideAnalysis),
            
            // Individual view scores for reference
            frontViewScore: frontAnalysis.postureScore || 0,
            sideViewScore: sideAnalysis.postureScore || 0
        };
        
        return combinedMetrics;
    }
    
    /**
     * Calculate overall alignment score from both views
     */
    calculateOverallAlignment(frontAnalysis, sideAnalysis) {
        const frontAlignment = 100 - Math.abs(frontAnalysis.shoulderTilt || 0) - Math.abs(frontAnalysis.hipTilt || 0);
        const sideAlignment = 100 - Math.abs(sideAnalysis.neckTilt || 0) - Math.abs(sideAnalysis.forwardHeadPosture || 0);
        
        return Math.max(0, Math.round((frontAlignment + sideAlignment) / 2));
    }
    
    /**
     * Save scan results to history for analytics display
     */
    async saveScanToHistory(analysisResults) {
        try {
            const scanRecord = {
                timestamp: Date.now(),
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
                overallScore: analysisResults.combinedMetrics.postureScore,
                frontViewScore: analysisResults.combinedMetrics.frontViewScore,
                sideViewScore: analysisResults.combinedMetrics.sideViewScore,
                metrics: {
                    neckTilt: analysisResults.combinedMetrics.neckTilt,
                    shoulderTilt: analysisResults.combinedMetrics.shoulderTilt,
                    hipTilt: analysisResults.combinedMetrics.hipTilt,
                    forwardHeadPosture: analysisResults.combinedMetrics.forwardHeadPosture,
                    overallAlignment: analysisResults.combinedMetrics.overallAlignment
                },
                views: ['front', 'side'],
                aiReport: analysisResults.aiReport,
                recommendations: await this.generateRecommendations(analysisResults.combinedMetrics)
            };
            
            // Get existing scan history
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['scanHistory'], resolve);
            });
            
            const scanHistory = result.scanHistory || [];
            scanHistory.push(scanRecord);
            
            // Keep only last 50 scans to prevent storage bloat
            if (scanHistory.length > 50) {
                scanHistory.splice(0, scanHistory.length - 50);
            }
            
            // Save updated history
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ scanHistory }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });
            
            console.log('✅ Scan results saved to history');
            
        } catch (error) {
            console.error('❌ Failed to save scan to history:', error);
        }
    }
    
    /**
     * Generate recommendations based on scan metrics
     */
    async generateRecommendations(metrics) {
        const recommendations = [];
        
        if (Math.abs(metrics.neckTilt) > 10) {
            const rec = await this.localizationService.translateText('Practice neck alignment exercises to reduce forward head posture');
            recommendations.push(rec);
        }
        
        if (Math.abs(metrics.shoulderTilt) > 5) {
            const rec = await this.localizationService.translateText('Focus on shoulder blade strengthening exercises');
            recommendations.push(rec);
        }
        
        if (Math.abs(metrics.hipTilt) > 5) {
            const rec = await this.localizationService.translateText('Work on hip flexor stretches and core strengthening');
            recommendations.push(rec);
        }
        
        if (metrics.postureScore < 70) {
            const rec = await this.localizationService.translateText('Consider taking regular posture breaks throughout the day');
            recommendations.push(rec);
        }
        
        if (recommendations.length === 0) {
            const rec = await this.localizationService.translateText('Great posture! Keep up the good work with regular movement breaks');
            recommendations.push(rec);
        }
        
        return recommendations;
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Capture the current frame from video
     */
    captureFrame() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8);
    }
    
    /**
     * Capture the current scan
     */
    async captureScan() {
        if (!this.currentPose) {
            this.showStatus('No pose detected. Please ensure you are visible in the camera.', 'error');
            return;
        }
        
        try {
            console.log('📸 Capturing scan...');
            
            // Show countdown
            await this.showCountdown();
            
            // Analyze posture
            this.showStatus('Analyzing posture...', 'loading');
            const postureMetrics = this.postureAnalyzer.analyzePosture(this.currentPose);
            
            // Generate AI report
            const aiReport = await this.aiReportGenerator.generateReport(postureMetrics);
            
            // Create analysis results for single view scan
            const analysisResults = {
                combinedMetrics: {
                    ...postureMetrics,
                    frontViewScore: postureMetrics.postureScore,
                    sideViewScore: 0, // Single view scan
                    overallAlignment: postureMetrics.postureScore
                },
                aiReport: aiReport
            };
            
            // Save scan results to history
            await this.saveScanToHistory(analysisResults);
            
            // Display results
            this.displayResults(analysisResults.combinedMetrics, aiReport);
            
            // Stop scanning and camera
            this.stopScanning();
            
            console.log('✅ Scan captured and analyzed');
        } catch (error) {
            console.error('❌ Failed to capture scan:', error);
            this.showStatus('Failed to analyze scan. Please try again.', 'error');
        }
    }
    
    /**
     * Show countdown before capture
     */
    async showCountdown() {
        return new Promise((resolve) => {
            this.elements.countdownOverlay.classList.remove('hidden');
            let count = 3;
            
            const updateCountdown = () => {
                this.elements.countdownValue.textContent = count;
                
                if (count > 0) {
                    count--;
                    setTimeout(updateCountdown, 1000);
                } else {
                    this.elements.countdownOverlay.classList.add('hidden');
                    resolve();
                }
            };
            
            updateCountdown();
        });
    }
    
    /**
     * Display scan results
     */
    async displayResults(postureMetrics, aiReport) {
        // Hide camera section after successful scan
        const videoContainer = document.querySelector('.video-container');
        if (videoContainer) {
            videoContainer.style.display = 'none';
        }
        
        // Hide scan controls
        const scanControls = document.querySelector('.scan-controls');
        if (scanControls) {
            scanControls.style.display = 'none';
        }
        
        const getScoreClass = (score) => {
            if (score >= 80) return 'score-good';
            if (score >= 60) return 'score-fair';
            return 'score-poor';
        };
        
        // Get translated text
        const scanCompleteTitle = await this.localizationService.translateText('🎉 Full Body Scan Complete!');
        const overallScoreLabel = await this.localizationService.translateText('Overall Posture Score');
        const outOf100 = await this.localizationService.translateText('out of 100');
        const detailedAnalysis = await this.localizationService.translateText('📊 Detailed Analysis');
        const neckTiltLabel = await this.localizationService.translateText('Neck Tilt');
        const shoulderTiltLabel = await this.localizationService.translateText('Shoulder Tilt');
        const hipAlignmentLabel = await this.localizationService.translateText('Hip Alignment');
        const overallAlignmentLabel = await this.localizationService.translateText('Overall Alignment');
        const multiViewAnalysis = await this.localizationService.translateText('👁️ Multi-View Analysis');
        const frontViewScore = await this.localizationService.translateText('Front View Score');
        const sideViewScore = await this.localizationService.translateText('Side View Score');
        const aiAnalysisTitle = await this.localizationService.translateText('🤖 AI Analysis & Recommendations');
        const scanResultsSaved = await this.localizationService.translateText('📈 Your scan results have been saved to your Full Body Scan History in View Past Data');
        const goodText = await this.localizationService.translateText('Good');
        const needsAttentionText = await this.localizationService.translateText('Needs attention');
        const excellentText = await this.localizationService.translateText('Excellent');
        const needsWorkText = await this.localizationService.translateText('Needs work');
        
        const resultsHtml = `
            <div style="margin-bottom: 24px;">
                <h3 style="color: var(--text); margin: 0 0 16px 0; font-size: 24px; text-align: center;">
                    ${scanCompleteTitle}
                </h3>
                
                <!-- Overall Score -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; padding: 20px; background: var(--secondaryBG); border: 2px solid var(--border); border-radius: 16px;">
                        <div style="font-size: 14px; color: var(--subtext); margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">${overallScoreLabel}</div>
                        <div class="${getScoreClass(postureMetrics.postureScore)}" style="font-size: 48px; font-weight: 800; margin-bottom: 8px;">${postureMetrics.postureScore}</div>
                        <div style="font-size: 16px; color: var(--subtext);">${outOf100}</div>
                    </div>
                </div>
                
                <!-- Detailed Metrics -->
                <h4 style="color: var(--text); margin: 0 0 12px 0;">${detailedAnalysis}</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px;">
                    <div style="padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; text-align: center;">
                        <div style="font-size: 12px; color: var(--subtext); margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">${neckTiltLabel}</div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 4px;">${Math.abs(postureMetrics.neckTilt).toFixed(1)}°</div>
                        <div style="font-size: 11px; color: var(--subtext);">${Math.abs(postureMetrics.neckTilt) < 10 ? goodText : needsAttentionText}</div>
                    </div>
                    <div style="padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; text-align: center;">
                        <div style="font-size: 12px; color: var(--subtext); margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">${shoulderTiltLabel}</div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 4px;">${Math.abs(postureMetrics.shoulderTilt).toFixed(1)}°</div>
                        <div style="font-size: 11px; color: var(--subtext);">${Math.abs(postureMetrics.shoulderTilt) < 5 ? goodText : needsAttentionText}</div>
                    </div>
                    <div style="padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; text-align: center;">
                        <div style="font-size: 12px; color: var(--subtext); margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">${hipAlignmentLabel}</div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 4px;">${Math.abs(postureMetrics.hipTilt || 0).toFixed(1)}°</div>
                        <div style="font-size: 11px; color: var(--subtext);">${Math.abs(postureMetrics.hipTilt || 0) < 5 ? goodText : needsAttentionText}</div>
                    </div>
                    <div style="padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; text-align: center;">
                        <div style="font-size: 12px; color: var(--subtext); margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">${overallAlignmentLabel}</div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 4px;">${postureMetrics.overallAlignment || 0}%</div>
                        <div style="font-size: 11px; color: var(--subtext);">${(postureMetrics.overallAlignment || 0) >= 80 ? excellentText : (postureMetrics.overallAlignment || 0) >= 60 ? goodText : needsWorkText}</div>
                    </div>
                </div>
                
                <!-- View Scores -->
                <h4 style="color: var(--text); margin: 0 0 12px 0;">${multiViewAnalysis}</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                    <div style="padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; text-align: center;">
                        <div style="font-size: 12px; color: var(--subtext); margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">${frontViewScore}</div>
                        <div class="${getScoreClass(postureMetrics.frontViewScore || 0)}" style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">${postureMetrics.frontViewScore || 0}</div>
                    </div>
                    <div style="padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 12px; text-align: center;">
                        <div style="font-size: 12px; color: var(--subtext); margin-bottom: 8px; text-transform: uppercase; font-weight: 600;">${sideViewScore}</div>
                        <div class="${getScoreClass(postureMetrics.sideViewScore || 0)}" style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">${postureMetrics.sideViewScore || 0}</div>
                    </div>
                </div>
            </div>
            
            ${aiReport ? `
                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--text); margin: 0 0 12px 0;">${aiAnalysisTitle}</h4>
                    <div style="background: var(--secondaryBG); border: 1px solid var(--border); border-radius: 12px; padding: 20px; line-height: 1.6;">
                        ${aiReport}
                    </div>
                </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 24px;">
                <p style="color: var(--subtext); margin-bottom: 16px; font-size: 14px;">
                    ${scanResultsSaved}
                </p>
            </div>
        `;
        
        this.elements.resultsContent.innerHTML = resultsHtml;
        this.elements.scanResults.classList.remove('hidden');
        this.elements.exercisesButton.classList.remove('hidden');
        
        // Hide status
        this.elements.scanStatus.classList.add('hidden');
        
        // Add new scan button
        this.addNewScanButton();
    }
    
    /**
     * Retake the scan
     */
    retakeScan() {
        console.log('🔄 Retaking scan...');
        
        // Hide results
        this.elements.scanResults.classList.add('hidden');
        this.elements.exercisesButton.classList.add('hidden');
        
        // Reset UI
        this.elements.startScanBtn.classList.add('hidden');
        this.elements.captureScanBtn.classList.remove('hidden');
        this.elements.retakeScanBtn.classList.remove('hidden');
        
        // Restart scanning
        this.startPoseDetection();
        this.showStatus('Camera ready. Position yourself for full body capture.', 'ready');
    }
    
    /**
     * Stop the scanning process
     */
    stopScanning() {
        this.isScanning = false;
        this.stopCamera();
    }
    
    /**
     * Stop camera stream
     */
    stopCamera() {
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
            console.log('📹 Camera stopped');
        }
    }
    
    /**
     * Cleanup resources for navigation
     */
    cleanup() {
        console.log('🧹 Cleaning up ScanPageController resources');
        
        // Stop scanning
        this.stopScanning();
        
        // Clear any running timers or intervals
        if (this.scanTimer) {
            clearTimeout(this.scanTimer);
            this.scanTimer = null;
        }
        
        // Clear pose detection
        this.currentPose = null;
        
        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        console.log('✅ ScanPageController cleanup complete');
    }
    
    /**
     * Handle language change event
     */
    async handleLanguageChange(newLanguage) {
        console.log('🌐 Language changed to:', newLanguage);
        
        // Update localization service language
        this.localizationService.currentLanguage = newLanguage;
        
        // Re-translate the interface
        await this.translateScanInterface();
        
        // Re-translate any visible results
        if (!this.elements.scanResults.classList.contains('hidden')) {
            // If results are visible, we need to re-render them with new language
            // This would require storing the results data and re-calling displayResults
            console.log('📊 Results are visible, may need manual refresh for full translation');
        }
    }
    
    /**
     * Translate the scan interface
     */
    async translateScanInterface() {
        try {
            // Translate page title and subtitle
            const scanTitle = document.querySelector('.scan-title');
            if (scanTitle) {
                const translatedTitle = await this.localizationService.translateText('📷 Full Body Posture Scan');
                scanTitle.textContent = translatedTitle;
            }
            
            const scanSubtitle = document.querySelector('.scan-subtitle');
            if (scanSubtitle) {
                const translatedSubtitle = await this.localizationService.translateText('Get comprehensive posture analysis with AI-powered insights');
                scanSubtitle.textContent = translatedSubtitle;
            }
            
            // Translate buttons
            const startScanBtn = document.getElementById('startScanBtn');
            if (startScanBtn) {
                const translatedText = await this.localizationService.translateText('📸 Start Scan');
                startScanBtn.textContent = translatedText;
            }
            
            const captureScanBtn = document.getElementById('captureScanBtn');
            if (captureScanBtn) {
                const translatedText = await this.localizationService.translateText('📸 Capture');
                captureScanBtn.textContent = translatedText;
            }
            
            const retakeScanBtn = document.getElementById('retakeScanBtn');
            if (retakeScanBtn) {
                const translatedText = await this.localizationService.translateText('🔄 Retake');
                retakeScanBtn.textContent = translatedText;
            }
            
            const exercisesButton = document.getElementById('exercisesButton');
            if (exercisesButton) {
                const translatedText = await this.localizationService.translateText('🏃‍♂️ Do Guided Exercises');
                exercisesButton.textContent = translatedText;
            }
            
            // Translate countdown overlay text
            const countdownTitle = document.querySelector('.countdown-content h2');
            if (countdownTitle) {
                const translatedText = await this.localizationService.translateText('Get Ready for Scan!');
                countdownTitle.textContent = translatedText;
            }
            
            const countdownDesc = document.querySelector('.countdown-content p');
            if (countdownDesc) {
                const translatedText = await this.localizationService.translateText('Position yourself for full body capture');
                countdownDesc.textContent = translatedText;
            }
            
            console.log('✅ Scan interface translated');
        } catch (error) {
            console.error('❌ Failed to translate scan interface:', error);
        }
    }
    
    /**
     * Show status message with translation
     */
    async showStatus(messageKey, type = 'info') {
        const statusElement = this.elements.scanStatus;
        const textElement = statusElement.querySelector('.status-text');
        
        // Translate the message
        const translatedMessage = await this.localizationService.translateText(messageKey);
        
        textElement.textContent = translatedMessage;
        
        // Add loading spinner for loading state
        if (type === 'loading') {
            textElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                    <div class="spinner"></div>
                    <span>${translatedMessage}</span>
                </div>
            `;
        }
        
        statusElement.classList.remove('hidden');
    }
    
    /**
     * Navigate back to main extension
     */
    navigateBack() {
        console.log('🔙 Navigating back to main extension');
        
        // Stop scanning
        this.stopScanning();
        
        // Use NavigationManager for proper cleanup and navigation
        if (this.navigationManager) {
            this.navigationManager.navigateBack();
        } else {
            // Fallback
            window.close();
        }
    }
    
    /**
     * Navigate to exercises page
     */
    navigateToExercises() {
        console.log('🏃‍♂️ Navigating to exercises page');
        
        // Stop scanning
        this.stopScanning();
        
        // Save scan results if available
        if (this.currentPose) {
            this.navigationManager.saveSessionState({
                type: 'scanResults',
                scanData: this.currentPose,
                timestamp: Date.now()
            });
        }
        
        // Use NavigationManager for proper navigation
        if (this.navigationManager) {
            this.navigationManager.navigateTo('exercises');
        } else {
            // Fallback
            const exercisesUrl = chrome.runtime.getURL('exercises.html');
            window.location.href = exercisesUrl;
        }
    }
    
    /**
     * Add new scan button after results are displayed
     */
    async addNewScanButton() {
        const scanControls = document.querySelector('.scan-controls');
        if (scanControls) {
            // Get translated button text
            const newScanText = await this.localizationService.translateText('📸 New Scan');
            const viewPastDataText = await this.localizationService.translateText('📊 View Past Data');
            
            scanControls.style.display = 'flex';
            scanControls.innerHTML = `
                <button id="newScanBtn" class="button button-primary">
                    ${newScanText}
                </button>
                <button id="viewAnalyticsBtn" class="button button-secondary">
                    ${viewPastDataText}
                </button>
            `;
            
            // Add event listeners
            const newScanBtn = document.getElementById('newScanBtn');
            const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
            
            if (newScanBtn) {
                newScanBtn.addEventListener('click', () => {
                    this.startNewScan();
                });
            }
            
            if (viewAnalyticsBtn) {
                viewAnalyticsBtn.addEventListener('click', () => {
                    this.navigateToAnalytics();
                });
            }
        }
    }
    
    /**
     * Start a new scan
     */
    async startNewScan() {
        console.log('🔄 Starting new scan');
        
        // Reset state
        this.frontCaptured = false;
        this.sideCaptured = false;
        this.capturePhase = 'front';
        this.autoDetectionEnabled = true;
        this.fullBodyDetectedTime = null;
        this.isCountingDown = false;
        
        // Show camera again
        const videoContainer = document.querySelector('.video-container');
        if (videoContainer) {
            videoContainer.style.display = 'block';
        }
        
        // Hide results
        this.elements.scanResults.classList.add('hidden');
        this.elements.exercisesButton.classList.add('hidden');
        
        // Reset controls with translated text
        const scanControls = document.querySelector('.scan-controls');
        if (scanControls) {
            const startScanText = await this.localizationService.translateText('📸 Start Scan');
            const captureText = await this.localizationService.translateText('📸 Capture');
            const retakeText = await this.localizationService.translateText('🔄 Retake');
            
            scanControls.innerHTML = `
                <button id="startScanBtn" class="button button-primary">
                    ${startScanText}
                </button>
                <button id="captureScanBtn" class="button button-primary hidden">
                    ${captureText}
                </button>
                <button id="retakeScanBtn" class="button button-secondary hidden">
                    ${retakeText}
                </button>
            `;
            
            // Re-setup event listeners
            this.setupEventListeners();
        }
        
        // Start new scan
        this.startScan();
    }
    
    /**
     * Navigate to analytics page
     */
    navigateToAnalytics() {
        console.log('📊 Navigating to analytics page');
        
        // Stop scanning
        this.stopScanning();
        
        // Use NavigationManager for proper navigation
        if (this.navigationManager) {
            this.navigationManager.navigateTo('analytics');
        } else {
            // Fallback
            const analyticsUrl = chrome.runtime.getURL('analytics.html');
            window.location.href = analyticsUrl;
        }
    }
}

// Initialize the scan page controller
new ScanPageController();