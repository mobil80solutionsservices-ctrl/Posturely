/**
 * EnhancedScanManager - Orchestrates the enhanced full body scan with comprehensive reporting
 * Integrates countdown audio, multi-view capture, and report generation
 */
import { CountdownAudioService } from './CountdownAudioService.js';
import { MultiViewCaptureEngine } from './MultiViewCaptureEngine.js';
import { PostureReportGenerator } from './PostureReportGenerator.js';

export class EnhancedScanManager {
    constructor() {
        this.countdownAudioService = new CountdownAudioService();
        this.multiViewCaptureEngine = new MultiViewCaptureEngine();
        this.postureReportGenerator = new PostureReportGenerator();
        
        this.isScanning = false;
        this.currentPoseData = {
            front: null,
            side: null
        };
        
        // UI elements (will be set during initialization)
        this.videoElement = null;
        this.canvasElement = null;
        this.statusElement = null;
        this.progressElement = null;
        this.countdownOverlay = null;
        this.countdownValueElement = null;
        
        // Callbacks
        this.onScanComplete = null;
        this.onScanError = null;
        this.onScanProgress = null;
    }

    /**
     * Initialize the enhanced scan manager
     * @param {Object} elements - UI elements
     * @param {Object} callbacks - Event callbacks
     */
    initialize(elements, callbacks = {}) {
        this.videoElement = elements.video;
        this.canvasElement = elements.canvas;
        this.statusElement = elements.status;
        this.progressElement = elements.progress;
        this.countdownOverlay = elements.countdownOverlay;
        this.countdownValueElement = elements.countdownValue;
        
        this.onScanComplete = callbacks.onComplete;
        this.onScanError = callbacks.onError;
        this.onScanProgress = callbacks.onProgress;
        
        console.log('🎯 Enhanced scan manager initialized');
    }

    /**
     * Start enhanced scan sequence
     * @param {Object} poseNet - Pose detection instance
     * @returns {Promise<void>}
     */
    async startEnhancedScan(poseNet) {
        if (this.isScanning) {
            console.warn('Scan already in progress');
            return;
        }

        try {
            this.isScanning = true;
            console.log('🚀 Starting enhanced scan sequence');
            
            // Update UI
            this.updateStatus('Preparing enhanced scan...', 'info');
            
            // Initialize camera with high resolution for scanning
            await this.initializeCamera();
            
            // Start countdown sequence
            await this.startCountdownSequence();
            
            // Start multi-view capture
            await this.startMultiViewCapture(poseNet);
            
        } catch (error) {
            console.error('❌ Enhanced scan failed:', error);
            this.handleScanError(error);
        }
    }

    /**
     * Initialize camera for scanning
     * @returns {Promise<void>}
     */
    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            
            this.videoElement.srcObject = stream;
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = resolve;
            });
            
            this.videoElement.play();
            
            // Set up canvas
            this.canvasElement.width = 1280;
            this.canvasElement.height = 720;
            
            console.log('📹 Camera initialized for enhanced scan');
            
        } catch (error) {
            throw new Error(`Camera initialization failed: ${error.message}`);
        }
    }

    /**
     * Start countdown sequence before capture
     * @returns {Promise<void>}
     */
    async startCountdownSequence() {
        return new Promise((resolve, reject) => {
            this.updateStatus('Get ready for scan...', 'info');
            
            // Show countdown overlay
            if (this.countdownOverlay) {
                this.countdownOverlay.classList.remove('hidden');
                this.countdownOverlay.style.display = 'flex';
            }
            
            // Start countdown audio and visual
            this.countdownAudioService.startCountdownSequence(
                (count, isComplete) => {
                    // Update countdown display
                    if (this.countdownValueElement) {
                        this.countdownValueElement.textContent = count > 0 ? count : '';
                    }
                    
                    if (this.onScanProgress) {
                        this.onScanProgress('countdown', count > 0 ? 'counting' : 'complete', 
                                          count > 0 ? `${count}` : 'Starting scan...');
                    }
                },
                () => {
                    // Hide countdown overlay
                    if (this.countdownOverlay) {
                        this.countdownOverlay.classList.add('hidden');
                        this.countdownOverlay.style.display = 'none';
                    }
                    
                    console.log('⏰ Countdown sequence completed');
                    resolve();
                },
                3 // 3-second countdown
            );
        });
    }

    /**
     * Start multi-view capture process
     * @param {Object} poseNet - Pose detection instance
     * @returns {Promise<void>}
     */
    async startMultiViewCapture(poseNet) {
        return new Promise((resolve, reject) => {
            // Start pose detection for capture validation
            this.startPoseDetection(poseNet);
            
            // Start multi-view capture sequence
            this.multiViewCaptureEngine.startCaptureSequence(
                this.videoElement,
                this.canvasElement,
                (view, step, message) => {
                    // Handle capture progress
                    this.updateStatus(message, 'info');
                    
                    if (this.onScanProgress) {
                        this.onScanProgress(view, step, message);
                    }
                    
                    console.log(`📸 Capture progress: ${view} - ${step} - ${message}`);
                },
                async (frontImage, sideImage) => {
                    // Handle capture completion
                    try {
                        console.log('✅ Multi-view capture completed');
                        await this.generateComprehensiveReport(frontImage, sideImage);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                },
                (error) => {
                    // Handle capture error
                    reject(error);
                }
            );
        });
    }

    /**
     * Start pose detection for capture validation
     * @param {Object} poseNet - Pose detection instance
     */
    startPoseDetection(poseNet) {
        const detectPose = async () => {
            if (!this.isScanning) return;
            
            if (this.videoElement && poseNet && this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
                try {
                    const pose = await poseNet.estimateSinglePose(this.videoElement);
                    
                    // Store pose data for current view
                    const currentView = this.multiViewCaptureEngine.currentView;
                    this.currentPoseData[currentView] = pose.keypoints;
                    
                    // Draw pose overlay
                    this.drawPoseOverlay(pose);
                    
                    // Validate pose for capture readiness
                    const validation = this.multiViewCaptureEngine.validatePoseForCapture(
                        pose.keypoints, 
                        this.canvasElement
                    );
                    
                    // Update status based on validation
                    if (validation.isReady) {
                        this.updateStatus(validation.message, 'success');
                    } else {
                        this.updateStatus(validation.message, 'warning');
                    }
                    
                } catch (error) {
                    console.error('Pose detection error during scan:', error);
                }
            }
            
            requestAnimationFrame(detectPose);
        };
        
        detectPose();
    }

    /**
     * Draw pose overlay on canvas
     * @param {Object} pose - Pose detection results
     */
    drawPoseOverlay(pose) {
        const ctx = this.canvasElement.getContext('2d');
        ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        if (pose.keypoints) {
            const keypoints = pose.keypoints;
            
            // Draw skeleton connections
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
            
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 3;
            
            connections.forEach(([startPart, endPart]) => {
                const start = keypoints.find(kp => kp.part === startPart);
                const end = keypoints.find(kp => kp.part === endPart);
                
                if (start && end && start.score > 0.5 && end.score > 0.5) {
                    ctx.beginPath();
                    ctx.moveTo(start.position.x, start.position.y);
                    ctx.lineTo(end.position.x, end.position.y);
                    ctx.stroke();
                }
            });
            
            // Draw key points
            ctx.fillStyle = '#FF0000';
            keypoints.forEach((keypoint) => {
                if (keypoint.score > 0.5) {
                    ctx.beginPath();
                    ctx.arc(keypoint.position.x, keypoint.position.y, 5, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }
    }

    /**
     * Generate comprehensive posture report
     * @param {Blob} frontImage - Front view image
     * @param {Blob} sideImage - Side view image
     * @returns {Promise<void>}
     */
    async generateComprehensiveReport(frontImage, sideImage) {
        try {
            this.updateStatus('Generating comprehensive report...', 'info');
            
            console.log('📊 Generating comprehensive posture report');
            
            // Generate report with captured images and pose data
            const reportData = await this.postureReportGenerator.generateReport(
                frontImage,
                sideImage,
                this.currentPoseData.front,
                this.currentPoseData.side
            );
            
            console.log('✅ Comprehensive report generated');
            
            // Download the report instead of just images
            await this.postureReportGenerator.downloadHTMLReport();
            
            this.updateStatus('Report generated and downloaded!', 'success');
            
            // Complete the scan
            this.completeScan(reportData);
            
        } catch (error) {
            console.error('❌ Report generation failed:', error);
            throw new Error(`Report generation failed: ${error.message}`);
        }
    }

    /**
     * Complete the scan process
     * @param {Object} reportData - Generated report data
     */
    completeScan(reportData) {
        this.isScanning = false;
        
        // Stop camera
        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
        
        // Clean up pose data
        this.currentPoseData = {
            front: null,
            side: null
        };
        
        console.log('🎉 Enhanced scan completed successfully');
        
        if (this.onScanComplete) {
            this.onScanComplete(reportData);
        }
    }

    /**
     * Handle scan errors
     * @param {Error} error - Error object
     */
    handleScanError(error) {
        this.isScanning = false;
        
        // Stop camera
        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
        
        // Hide countdown overlay
        if (this.countdownOverlay) {
            this.countdownOverlay.classList.add('hidden');
            this.countdownOverlay.style.display = 'none';
        }
        
        // Stop countdown audio
        this.countdownAudioService.stopCountdown();
        
        // Cancel capture
        this.multiViewCaptureEngine.cancelCapture();
        
        this.updateStatus(`Scan failed: ${error.message}`, 'error');
        
        console.error('❌ Enhanced scan error:', error);
        
        if (this.onScanError) {
            this.onScanError(error);
        }
    }

    /**
     * Cancel current scan
     */
    cancelScan() {
        if (!this.isScanning) return;
        
        console.log('🚫 Cancelling enhanced scan');
        
        // Stop all processes
        this.countdownAudioService.stopCountdown();
        this.multiViewCaptureEngine.cancelCapture();
        
        this.handleScanError(new Error('Scan cancelled by user'));
    }

    /**
     * Update status display
     * @param {string} message - Status message
     * @param {string} type - Status type (info, success, warning, error)
     */
    updateStatus(message, type = 'info') {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.className = `status status-${type}`;
        }
        
        console.log(`📱 Status: ${message} (${type})`);
    }

    /**
     * Check if scan is in progress
     * @returns {boolean}
     */
    isScanInProgress() {
        return this.isScanning;
    }

    /**
     * Get scan status
     * @returns {Object}
     */
    getScanStatus() {
        return {
            isScanning: this.isScanning,
            captureStatus: this.multiViewCaptureEngine.getCaptureStatus(),
            countdownActive: this.countdownAudioService.isCountdownPlaying()
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.cancelScan();
        
        this.countdownAudioService.cleanup();
        this.multiViewCaptureEngine.cleanup();
        this.postureReportGenerator.cleanup();
        
        // Reset pose data
        this.currentPoseData = {
            front: null,
            side: null
        };
        
        console.log('🧹 Enhanced scan manager cleaned up');
    }
}