/**
 * EnhancedPostureAnalyzer - Calculates comprehensive posture metrics
 * Implements enhanced analysis for neck tilt, shoulder tilt, spine curvature, and slouch detection
 */
export class EnhancedPostureAnalyzer {
    constructor() {
        console.log('🔬 EnhancedPostureAnalyzer initialized');
    }
    
    /**
     * Analyze posture from pose keypoints
     * @param {Object} pose - Pose detection results with keypoints
     * @returns {Object} Comprehensive posture metrics
     */
    analyzePosture(pose) {
        if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
            return this.getDefaultMetrics();
        }
        
        const keypoints = pose.keypoints;
        
        // Calculate individual metrics
        const neckTilt = this.calculateNeckTilt(keypoints);
        const shoulderTilt = this.calculateShoulderTilt(keypoints);
        const spineAngle = this.calculateSpineCurvature(keypoints);
        const slouchCount = this.calculateSlouchCount(keypoints);
        const postureScore = this.calculatePostureScore({
            neckTilt,
            shoulderTilt,
            spineAngle,
            slouchCount
        });
        
        const metrics = {
            timestamp: Date.now(),
            neckTilt,
            shoulderTilt,
            spineAngle,
            slouchCount,
            postureScore
        };
        
        console.log('📊 Posture analysis complete:', metrics);
        return metrics;
    }
    
    /**
     * Calculate neck tilt angle using MediaPipe landmarks
     * @param {Array} keypoints - Array of pose keypoints
     * @returns {number} Neck tilt angle in degrees
     */
    calculateNeckTilt(keypoints) {
        const nose = this.findKeypoint(keypoints, 'nose');
        const leftShoulder = this.findKeypoint(keypoints, 'leftShoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'rightShoulder');
        
        if (!nose || !leftShoulder || !rightShoulder) {
            return 0;
        }
        
        // Calculate shoulder center
        const shoulderCenter = {
            x: (leftShoulder.position.x + rightShoulder.position.x) / 2,
            y: (leftShoulder.position.y + rightShoulder.position.y) / 2
        };
        
        // Calculate angle from vertical
        const dx = nose.position.x - shoulderCenter.x;
        const dy = nose.position.y - shoulderCenter.y;
        
        // Convert to angle from vertical (0 degrees = straight up)
        const angle = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
        
        return Math.min(angle, 45); // Cap at 45 degrees for reasonable values
    }
    
    /**
     * Calculate shoulder tilt for left-right imbalance detection
     * @param {Array} keypoints - Array of pose keypoints
     * @returns {number} Shoulder tilt angle in degrees
     */
    calculateShoulderTilt(keypoints) {
        const leftShoulder = this.findKeypoint(keypoints, 'leftShoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'rightShoulder');
        
        if (!leftShoulder || !rightShoulder) {
            return 0;
        }
        
        // Calculate height difference
        const heightDiff = Math.abs(leftShoulder.position.y - rightShoulder.position.y);
        const shoulderWidth = Math.abs(leftShoulder.position.x - rightShoulder.position.x);
        
        // Convert to angle
        const angle = Math.atan2(heightDiff, shoulderWidth) * (180 / Math.PI);
        
        return Math.min(angle, 30); // Cap at 30 degrees for reasonable values
    }
    
    /**
     * Calculate spine curvature angle for spine angle measurement
     * @param {Array} keypoints - Array of pose keypoints
     * @returns {number} Spine angle in degrees from vertical
     */
    calculateSpineCurvature(keypoints) {
        const leftShoulder = this.findKeypoint(keypoints, 'leftShoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'rightShoulder');
        const leftHip = this.findKeypoint(keypoints, 'leftHip');
        const rightHip = this.findKeypoint(keypoints, 'rightHip');
        
        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
            return 0;
        }
        
        // Calculate shoulder and hip centers
        const shoulderCenter = {
            x: (leftShoulder.position.x + rightShoulder.position.x) / 2,
            y: (leftShoulder.position.y + rightShoulder.position.y) / 2
        };
        
        const hipCenter = {
            x: (leftHip.position.x + rightHip.position.x) / 2,
            y: (leftHip.position.y + rightHip.position.y) / 2
        };
        
        // Calculate spine angle from vertical
        const dx = shoulderCenter.x - hipCenter.x;
        const dy = shoulderCenter.y - hipCenter.y;
        
        const angle = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
        
        return Math.min(angle, 45); // Cap at 45 degrees
    }
    
    /**
     * Calculate slouch count based on forward deviation
     * @param {Array} keypoints - Array of pose keypoints
     * @returns {number} Slouch severity score (0-100)
     */
    calculateSlouchCount(keypoints) {
        const nose = this.findKeypoint(keypoints, 'nose');
        const leftShoulder = this.findKeypoint(keypoints, 'leftShoulder');
        const rightShoulder = this.findKeypoint(keypoints, 'rightShoulder');
        
        if (!nose || !leftShoulder || !rightShoulder) {
            return 0;
        }
        
        // Calculate shoulder center
        const shoulderCenter = {
            x: (leftShoulder.position.x + rightShoulder.position.x) / 2,
            y: (leftShoulder.position.y + rightShoulder.position.y) / 2
        };
        
        // Calculate forward head posture
        const forwardDistance = Math.abs(nose.position.x - shoulderCenter.x);
        const shoulderWidth = Math.abs(leftShoulder.position.x - rightShoulder.position.x);
        
        // Normalize by shoulder width and convert to 0-100 scale
        const normalizedDistance = (forwardDistance / shoulderWidth) * 100;
        
        return Math.min(normalizedDistance, 100);
    }
    
    /**
     * Create overall posture score for overall scoring
     * @param {Object} metrics - Individual posture metrics
     * @returns {number} Overall posture score (0-100)
     */
    calculatePostureScore(metrics) {
        let score = 100;
        
        // Penalize neck tilt (0-45 degrees)
        if (metrics.neckTilt > 10) {
            score -= Math.min((metrics.neckTilt - 10) * 2, 30);
        }
        
        // Penalize shoulder tilt (0-30 degrees)
        if (metrics.shoulderTilt > 5) {
            score -= Math.min((metrics.shoulderTilt - 5) * 2, 25);
        }
        
        // Penalize spine curvature (0-45 degrees)
        if (metrics.spineAngle > 8) {
            score -= Math.min((metrics.spineAngle - 8) * 1.5, 25);
        }
        
        // Penalize slouching (0-100 scale)
        if (metrics.slouchCount > 20) {
            score -= Math.min((metrics.slouchCount - 20) * 0.5, 20);
        }
        
        return Math.max(Math.round(score), 0);
    }
    
    /**
     * Find a specific keypoint by part name
     * @param {Array} keypoints - Array of keypoints
     * @param {string} partName - Name of the body part to find
     * @returns {Object|null} Keypoint object or null if not found
     */
    findKeypoint(keypoints, partName) {
        const keypoint = keypoints.find(kp => kp.part === partName);
        return (keypoint && keypoint.score > 0.3) ? keypoint : null;
    }
    
    /**
     * Get default metrics when pose detection fails
     * @returns {Object} Default posture metrics
     */
    getDefaultMetrics() {
        return {
            timestamp: Date.now(),
            neckTilt: 0,
            shoulderTilt: 0,
            spineAngle: 0,
            slouchCount: 0,
            postureScore: 0
        };
    }
}