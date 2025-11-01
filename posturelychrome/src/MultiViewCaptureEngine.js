/**
 * MultiViewCaptureEngine - Manages multi-view capture system for comprehensive posture analysis
 * Captures both front and side view images with user guidance for proper positioning
 */
export class MultiViewCaptureEngine {
    constructor() {
        this.currentView = 'front'; // 'front' or 'side'
        this.capturedImages = {
            front: null,
            side: null
        };
        this.isCapturing = false;
        this.onProgressCallback = null;
        this.onCompleteCallback = null;
        this.onErrorCallback = null;
    }

    /**
     * Start multi-view capture sequence
     * @param {HTMLVideoElement} videoElement - Video element for camera feed
     * @param {HTMLCanvasElement} canvasElement - Canvas element for pose overlay
     * @param {Function} onProgress - Progress callback (view, step, message)
     * @param {Function} onComplete - Completion callback (frontImage, sideImage)
     * @param {Function} onError - Error callback (error)
     */
    startCaptureSequence(videoElement, canvasElement, onProgress, onComplete, onError) {
        if (this.isCapturing) {
            console.warn('Capture sequence already in progress');
            return;
        }

        this.isCapturing = true;
        this.onProgressCallback = onProgress;
        this.onCompleteCallback = onComplete;
        this.onErrorCallback = onError;
        
        // Reset captured images
        this.capturedImages = {
            front: null,
            side: null
        };

        console.log('📸 Starting multi-view capture sequence');
        
        // Start with front view
        this.currentView = 'front';
        this.guideFrontViewCapture(videoElement, canvasElement);
    }

    /**
     * Guide user for front view capture
     */
    guideFrontViewCapture(videoElement, canvasElement) {
        if (this.onProgressCallback) {
            this.onProgressCallback('front', 'positioning', 'Position yourself facing the camera. Stand straight with arms at your sides.');
        }

        // Wait for user to position themselves
        setTimeout(() => {
            if (this.onProgressCallback) {
                this.onProgressCallback('front', 'ready', 'Get ready for front view capture...');
            }
            
            // Capture front view after brief delay
            setTimeout(() => {
                this.captureFrontView(videoElement, canvasElement);
            }, 2000);
        }, 3000);
    }

    /**
     * Capture front view image
     */
    captureFrontView(videoElement, canvasElement) {
        try {
            if (this.onProgressCallback) {
                this.onProgressCallback('front', 'capturing', 'Capturing front view...');
            }

            // Create temporary canvas for capture
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = videoElement.videoWidth || 1280;
            captureCanvas.height = videoElement.videoHeight || 720;
            const ctx = captureCanvas.getContext('2d');

            // Draw video frame
            ctx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);

            // Convert to blob
            captureCanvas.toBlob((blob) => {
                if (blob) {
                    this.capturedImages.front = blob;
                    console.log('✅ Front view captured');
                    
                    if (this.onProgressCallback) {
                        this.onProgressCallback('front', 'complete', 'Front view captured successfully!');
                    }

                    // Proceed to side view
                    setTimeout(() => {
                        this.guideSideViewCapture(videoElement, canvasElement);
                    }, 1500);
                } else {
                    this.handleError('Failed to capture front view image');
                }
            }, 'image/png');

        } catch (error) {
            this.handleError(`Front view capture error: ${error.message}`);
        }
    }

    /**
     * Guide user for side view capture
     */
    guideSideViewCapture(videoElement, canvasElement) {
        this.currentView = 'side';
        
        if (this.onProgressCallback) {
            this.onProgressCallback('side', 'positioning', 'Now turn to your right side. Stand in profile with your right side facing the camera.');
        }

        // Wait for user to reposition
        setTimeout(() => {
            if (this.onProgressCallback) {
                this.onProgressCallback('side', 'ready', 'Get ready for side view capture...');
            }
            
            // Capture side view after brief delay
            setTimeout(() => {
                this.captureSideView(videoElement, canvasElement);
            }, 2000);
        }, 4000); // Longer delay for repositioning
    }

    /**
     * Capture side view image
     */
    captureSideView(videoElement, canvasElement) {
        try {
            if (this.onProgressCallback) {
                this.onProgressCallback('side', 'capturing', 'Capturing side view...');
            }

            // Create temporary canvas for capture
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = videoElement.videoWidth || 1280;
            captureCanvas.height = videoElement.videoHeight || 720;
            const ctx = captureCanvas.getContext('2d');

            // Draw video frame
            ctx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);

            // Convert to blob
            captureCanvas.toBlob((blob) => {
                if (blob) {
                    this.capturedImages.side = blob;
                    console.log('✅ Side view captured');
                    
                    if (this.onProgressCallback) {
                        this.onProgressCallback('side', 'complete', 'Side view captured successfully!');
                    }

                    // Complete the capture sequence
                    this.completeCaptureSequence();
                } else {
                    this.handleError('Failed to capture side view image');
                }
            }, 'image/png');

        } catch (error) {
            this.handleError(`Side view capture error: ${error.message}`);
        }
    }

    /**
     * Complete the capture sequence
     */
    completeCaptureSequence() {
        if (this.capturedImages.front && this.capturedImages.side) {
            console.log('🎉 Multi-view capture sequence completed');
            
            if (this.onProgressCallback) {
                this.onProgressCallback('complete', 'success', 'Both views captured successfully!');
            }

            if (this.onCompleteCallback) {
                this.onCompleteCallback(this.capturedImages.front, this.capturedImages.side);
            }
        } else {
            this.handleError('Incomplete capture - missing front or side view');
        }

        this.isCapturing = false;
    }

    /**
     * Handle capture errors
     */
    handleError(errorMessage) {
        console.error('❌ Capture error:', errorMessage);
        
        if (this.onErrorCallback) {
            this.onErrorCallback(new Error(errorMessage));
        }

        this.isCapturing = false;
    }

    /**
     * Cancel current capture sequence
     */
    cancelCapture() {
        if (this.isCapturing) {
            console.log('🚫 Cancelling capture sequence');
            this.isCapturing = false;
            
            // Clean up captured images
            this.capturedImages = {
                front: null,
                side: null
            };

            if (this.onProgressCallback) {
                this.onProgressCallback('cancelled', 'cancelled', 'Capture sequence cancelled');
            }
        }
    }

    /**
     * Get current capture status
     */
    getCaptureStatus() {
        return {
            isCapturing: this.isCapturing,
            currentView: this.currentView,
            frontCaptured: !!this.capturedImages.front,
            sideCaptured: !!this.capturedImages.side
        };
    }

    /**
     * Get captured images
     */
    getCapturedImages() {
        return {
            front: this.capturedImages.front,
            side: this.capturedImages.side
        };
    }

    /**
     * Validate pose for capture readiness
     * @param {Array} keypoints - Pose keypoints from MediaPipe
     * @param {HTMLCanvasElement} canvas - Canvas for reference
     * @returns {Object} Validation result
     */
    validatePoseForCapture(keypoints, canvas) {
        if (!keypoints || keypoints.length === 0) {
            return {
                isReady: false,
                message: 'No pose detected. Please ensure you are visible in the camera.',
                issues: ['no_pose']
            };
        }

        const issues = [];
        let message = '';

        // Check for required landmarks based on current view
        const requiredParts = this.currentView === 'front' 
            ? ['nose', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip']
            : ['nose', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee'];

        const missingParts = requiredParts.filter(part => {
            const kp = keypoints.find(k => k.part === part);
            return !kp || kp.score < 0.5;
        });

        if (missingParts.length > 0) {
            issues.push('missing_landmarks');
            message = `Missing key body parts: ${missingParts.join(', ')}. Please adjust your position.`;
        }

        // Check if person is properly positioned in frame
        const nose = keypoints.find(k => k.part === 'nose');
        const leftShoulder = keypoints.find(k => k.part === 'leftShoulder');
        const rightShoulder = keypoints.find(k => k.part === 'rightShoulder');

        if (nose && leftShoulder && rightShoulder) {
            const frameCenter = canvas.width / 2;
            const personCenter = (leftShoulder.position.x + rightShoulder.position.x) / 2;
            const offset = Math.abs(personCenter - frameCenter);
            
            if (offset > canvas.width * 0.2) {
                issues.push('off_center');
                message = 'Please center yourself in the camera frame.';
            }

            // Check if too close or too far
            const shoulderWidth = Math.abs(leftShoulder.position.x - rightShoulder.position.x);
            const expectedWidth = canvas.width * 0.15; // Expected shoulder width ratio
            
            if (shoulderWidth < expectedWidth * 0.7) {
                issues.push('too_far');
                message = 'Please move closer to the camera.';
            } else if (shoulderWidth > expectedWidth * 1.5) {
                issues.push('too_close');
                message = 'Please move back from the camera.';
            }
        }

        const isReady = issues.length === 0;
        
        if (isReady) {
            message = this.currentView === 'front' 
                ? 'Perfect! Ready for front view capture.'
                : 'Perfect! Ready for side view capture.';
        }

        return {
            isReady,
            message,
            issues
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.cancelCapture();
        
        // Clean up blob URLs if any
        if (this.capturedImages.front) {
            URL.revokeObjectURL(this.capturedImages.front);
        }
        if (this.capturedImages.side) {
            URL.revokeObjectURL(this.capturedImages.side);
        }
        
        this.capturedImages = {
            front: null,
            side: null
        };
    }
}