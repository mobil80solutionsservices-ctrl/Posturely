/**
 * PostureReportGenerator - Creates comprehensive posture reports with analysis and recommendations
 * Generates detailed reports including captured images, angle measurements, and posture analysis
 */
export class PostureReportGenerator {
    constructor() {
        this.reportData = null;
        this.analysisResults = null;
    }

    /**
     * Generate comprehensive posture report
     * @param {Blob} frontImage - Front view image blob
     * @param {Blob} sideImage - Side view image blob
     * @param {Array} frontPoseData - Front view pose landmarks
     * @param {Array} sidePoseData - Side view pose landmarks
     * @param {Object} options - Report generation options
     * @returns {Promise<Object>} Generated report data
     */
    async generateReport(frontImage, sideImage, frontPoseData, sidePoseData, options = {}) {
        try {
            console.log('📊 Generating comprehensive posture report');

            // Analyze posture data
            this.analysisResults = await this.analyzePostureData(frontPoseData, sidePoseData);

            // Generate report data structure
            this.reportData = {
                id: this.generateReportId(),
                timestamp: new Date().toISOString(),
                images: {
                    front: frontImage,
                    side: sideImage
                },
                analysis: this.analysisResults,
                recommendations: this.generateRecommendations(this.analysisResults),
                summary: this.generateSummary(this.analysisResults),
                metadata: {
                    version: '1.0',
                    generatedBy: 'Posturely Chrome Extension',
                    reportType: 'comprehensive_posture_analysis'
                }
            };

            console.log('✅ Posture report generated successfully');
            return this.reportData;

        } catch (error) {
            console.error('❌ Error generating posture report:', error);
            throw new Error(`Report generation failed: ${error.message}`);
        }
    }

    /**
     * Analyze posture data from both views
     * @param {Array} frontPoseData - Front view pose landmarks
     * @param {Array} sidePoseData - Side view pose landmarks
     * @returns {Object} Analysis results
     */
    async analyzePostureData(frontPoseData, sidePoseData) {
        const analysis = {
            frontView: this.analyzeFrontView(frontPoseData),
            sideView: this.analyzeSideView(sidePoseData),
            overallScore: 0,
            issues: [],
            strengths: []
        };

        // Calculate overall posture score
        analysis.overallScore = this.calculateOverallScore(analysis.frontView, analysis.sideView);

        // Identify issues and strengths
        this.identifyPostureIssues(analysis);

        return analysis;
    }

    /**
     * Analyze front view posture
     * @param {Array} poseData - Front view pose landmarks
     * @returns {Object} Front view analysis
     */
    analyzeFrontView(poseData) {
        if (!poseData || poseData.length === 0) {
            return {
                shoulderAlignment: { angle: 0, score: 0, status: 'unknown' },
                hipAlignment: { angle: 0, score: 0, status: 'unknown' },
                headTilt: { angle: 0, score: 0, status: 'unknown' },
                overallScore: 0
            };
        }

        const analysis = {};

        // Shoulder alignment analysis
        const leftShoulder = poseData.find(p => p.part === 'leftShoulder');
        const rightShoulder = poseData.find(p => p.part === 'rightShoulder');
        
        if (leftShoulder && rightShoulder) {
            const shoulderAngle = this.calculateAngle(
                leftShoulder.position, rightShoulder.position, { x: rightShoulder.position.x + 100, y: rightShoulder.position.y }
            );
            analysis.shoulderAlignment = {
                angle: Math.abs(shoulderAngle),
                score: this.scoreAlignment(Math.abs(shoulderAngle), 5), // 5 degrees tolerance
                status: Math.abs(shoulderAngle) < 5 ? 'good' : Math.abs(shoulderAngle) < 10 ? 'fair' : 'poor'
            };
        }

        // Hip alignment analysis
        const leftHip = poseData.find(p => p.part === 'leftHip');
        const rightHip = poseData.find(p => p.part === 'rightHip');
        
        if (leftHip && rightHip) {
            const hipAngle = this.calculateAngle(
                leftHip.position, rightHip.position, { x: rightHip.position.x + 100, y: rightHip.position.y }
            );
            analysis.hipAlignment = {
                angle: Math.abs(hipAngle),
                score: this.scoreAlignment(Math.abs(hipAngle), 3), // 3 degrees tolerance
                status: Math.abs(hipAngle) < 3 ? 'good' : Math.abs(hipAngle) < 6 ? 'fair' : 'poor'
            };
        }

        // Head tilt analysis
        const nose = poseData.find(p => p.part === 'nose');
        const leftEye = poseData.find(p => p.part === 'leftEye');
        const rightEye = poseData.find(p => p.part === 'rightEye');
        
        if (nose && leftEye && rightEye) {
            const eyeAngle = this.calculateAngle(
                leftEye.position, rightEye.position, { x: rightEye.position.x + 100, y: rightEye.position.y }
            );
            analysis.headTilt = {
                angle: Math.abs(eyeAngle),
                score: this.scoreAlignment(Math.abs(eyeAngle), 3), // 3 degrees tolerance
                status: Math.abs(eyeAngle) < 3 ? 'good' : Math.abs(eyeAngle) < 6 ? 'fair' : 'poor'
            };
        }

        // Calculate overall front view score
        const scores = Object.values(analysis).filter(item => item.score !== undefined).map(item => item.score);
        analysis.overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        return analysis;
    }

    /**
     * Analyze side view posture
     * @param {Array} poseData - Side view pose landmarks
     * @returns {Object} Side view analysis
     */
    analyzeSideView(poseData) {
        if (!poseData || poseData.length === 0) {
            return {
                neckAngle: { angle: 0, score: 0, status: 'unknown' },
                spineAlignment: { angle: 0, score: 0, status: 'unknown' },
                forwardHeadPosture: { distance: 0, score: 0, status: 'unknown' },
                overallScore: 0
            };
        }

        const analysis = {};

        // Neck angle analysis (cervical spine)
        const nose = poseData.find(p => p.part === 'nose');
        const leftShoulder = poseData.find(p => p.part === 'leftShoulder');
        const rightShoulder = poseData.find(p => p.part === 'rightShoulder');
        
        if (nose && leftShoulder && rightShoulder) {
            const shoulderCenter = {
                x: (leftShoulder.position.x + rightShoulder.position.x) / 2,
                y: (leftShoulder.position.y + rightShoulder.position.y) / 2
            };
            
            const neckAngle = this.calculateAngleFromVertical(nose.position, shoulderCenter);
            analysis.neckAngle = {
                angle: neckAngle,
                score: this.scoreNeckAngle(neckAngle),
                status: neckAngle < 15 ? 'good' : neckAngle < 25 ? 'fair' : 'poor'
            };

            // Forward head posture
            const forwardDistance = Math.abs(nose.position.x - shoulderCenter.x);
            analysis.forwardHeadPosture = {
                distance: forwardDistance,
                score: this.scoreForwardHead(forwardDistance),
                status: forwardDistance < 30 ? 'good' : forwardDistance < 60 ? 'fair' : 'poor'
            };
        }

        // Spine alignment analysis
        const leftHip = poseData.find(p => p.part === 'leftHip');
        const rightHip = poseData.find(p => p.part === 'rightHip');
        
        if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const shoulderCenter = {
                x: (leftShoulder.position.x + rightShoulder.position.x) / 2,
                y: (leftShoulder.position.y + rightShoulder.position.y) / 2
            };
            const hipCenter = {
                x: (leftHip.position.x + rightHip.position.x) / 2,
                y: (leftHip.position.y + rightHip.position.y) / 2
            };
            
            const spineAngle = this.calculateAngleFromVertical(shoulderCenter, hipCenter);
            analysis.spineAlignment = {
                angle: spineAngle,
                score: this.scoreSpineAlignment(spineAngle),
                status: spineAngle < 10 ? 'good' : spineAngle < 20 ? 'fair' : 'poor'
            };
        }

        // Calculate overall side view score
        const scores = Object.values(analysis).filter(item => item.score !== undefined).map(item => item.score);
        analysis.overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        return analysis;
    }

    /**
     * Calculate angle between three points
     * @param {Object} p1 - First point {x, y}
     * @param {Object} p2 - Second point (vertex) {x, y}
     * @param {Object} p3 - Third point {x, y}
     * @returns {number} Angle in degrees
     */
    calculateAngle(p1, p2, p3) {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        const cos = dot / (mag1 * mag2);
        return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
    }

    /**
     * Calculate angle from vertical
     * @param {Object} p1 - First point {x, y}
     * @param {Object} p2 - Second point {x, y}
     * @returns {number} Angle from vertical in degrees
     */
    calculateAngleFromVertical(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const angle = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
        return angle;
    }

    /**
     * Score alignment based on angle deviation
     * @param {number} angle - Angle deviation
     * @param {number} tolerance - Acceptable tolerance
     * @returns {number} Score 0-100
     */
    scoreAlignment(angle, tolerance) {
        if (angle <= tolerance) return 100;
        if (angle >= tolerance * 4) return 0;
        return Math.round(100 - ((angle - tolerance) / (tolerance * 3)) * 100);
    }

    /**
     * Score neck angle
     * @param {number} angle - Neck angle
     * @returns {number} Score 0-100
     */
    scoreNeckAngle(angle) {
        if (angle <= 15) return 100;
        if (angle >= 45) return 0;
        return Math.round(100 - ((angle - 15) / 30) * 100);
    }

    /**
     * Score forward head posture
     * @param {number} distance - Forward distance
     * @returns {number} Score 0-100
     */
    scoreForwardHead(distance) {
        if (distance <= 30) return 100;
        if (distance >= 100) return 0;
        return Math.round(100 - ((distance - 30) / 70) * 100);
    }

    /**
     * Score spine alignment
     * @param {number} angle - Spine angle from vertical
     * @returns {number} Score 0-100
     */
    scoreSpineAlignment(angle) {
        if (angle <= 10) return 100;
        if (angle >= 30) return 0;
        return Math.round(100 - ((angle - 10) / 20) * 100);
    }

    /**
     * Calculate overall posture score
     * @param {Object} frontAnalysis - Front view analysis
     * @param {Object} sideAnalysis - Side view analysis
     * @returns {number} Overall score 0-100
     */
    calculateOverallScore(frontAnalysis, sideAnalysis) {
        const frontScore = frontAnalysis.overallScore || 0;
        const sideScore = sideAnalysis.overallScore || 0;
        
        // Weight side view more heavily as it shows more critical posture issues
        return Math.round((frontScore * 0.4) + (sideScore * 0.6));
    }

    /**
     * Identify posture issues and strengths
     * @param {Object} analysis - Complete analysis object
     */
    identifyPostureIssues(analysis) {
        const issues = [];
        const strengths = [];

        // Check front view issues
        if (analysis.frontView.shoulderAlignment && analysis.frontView.shoulderAlignment.status === 'poor') {
            issues.push({
                type: 'shoulder_misalignment',
                severity: 'high',
                description: 'Significant shoulder height difference detected',
                recommendation: 'Focus on shoulder blade exercises and posture awareness'
            });
        } else if (analysis.frontView.shoulderAlignment && analysis.frontView.shoulderAlignment.status === 'good') {
            strengths.push('Good shoulder alignment');
        }

        if (analysis.frontView.hipAlignment && analysis.frontView.hipAlignment.status === 'poor') {
            issues.push({
                type: 'hip_misalignment',
                severity: 'medium',
                description: 'Hip imbalance detected',
                recommendation: 'Consider core strengthening and hip mobility exercises'
            });
        } else if (analysis.frontView.hipAlignment && analysis.frontView.hipAlignment.status === 'good') {
            strengths.push('Good hip alignment');
        }

        // Check side view issues
        if (analysis.sideView.neckAngle && analysis.sideView.neckAngle.status === 'poor') {
            issues.push({
                type: 'forward_head_posture',
                severity: 'high',
                description: 'Significant forward head posture detected',
                recommendation: 'Perform neck strengthening exercises and improve workstation ergonomics'
            });
        } else if (analysis.sideView.neckAngle && analysis.sideView.neckAngle.status === 'good') {
            strengths.push('Good neck alignment');
        }

        if (analysis.sideView.spineAlignment && analysis.sideView.spineAlignment.status === 'poor') {
            issues.push({
                type: 'spine_misalignment',
                severity: 'high',
                description: 'Poor spinal alignment detected',
                recommendation: 'Focus on core strengthening and spinal mobility exercises'
            });
        } else if (analysis.sideView.spineAlignment && analysis.sideView.spineAlignment.status === 'good') {
            strengths.push('Good spinal alignment');
        }

        analysis.issues = issues;
        analysis.strengths = strengths;
    }

    /**
     * Generate personalized recommendations
     * @param {Object} analysisResults - Analysis results
     * @returns {Array} Array of recommendations
     */
    generateRecommendations(analysisResults) {
        const recommendations = [];

        // General recommendations based on overall score
        if (analysisResults.overallScore >= 80) {
            recommendations.push({
                category: 'maintenance',
                priority: 'low',
                title: 'Maintain Your Good Posture',
                description: 'Your posture is excellent! Continue with regular movement breaks and posture awareness.',
                exercises: ['Posture check reminders', 'Regular stretching', 'Ergonomic workspace maintenance']
            });
        } else if (analysisResults.overallScore >= 60) {
            recommendations.push({
                category: 'improvement',
                priority: 'medium',
                title: 'Moderate Posture Improvements Needed',
                description: 'Your posture shows some areas for improvement. Focus on the specific issues identified.',
                exercises: ['Daily posture exercises', 'Workspace ergonomics review', 'Regular movement breaks']
            });
        } else {
            recommendations.push({
                category: 'correction',
                priority: 'high',
                title: 'Significant Posture Correction Required',
                description: 'Your posture needs attention. Consider consulting a healthcare professional.',
                exercises: ['Professional posture assessment', 'Targeted exercise program', 'Ergonomic workspace setup']
            });
        }

        // Specific recommendations based on issues
        analysisResults.issues.forEach(issue => {
            switch (issue.type) {
                case 'forward_head_posture':
                    recommendations.push({
                        category: 'neck',
                        priority: 'high',
                        title: 'Forward Head Posture Correction',
                        description: 'Strengthen neck muscles and improve workstation ergonomics.',
                        exercises: [
                            'Chin tucks (10 reps, 3 times daily)',
                            'Neck strengthening exercises',
                            'Monitor height adjustment',
                            'Regular posture breaks'
                        ]
                    });
                    break;
                case 'shoulder_misalignment':
                    recommendations.push({
                        category: 'shoulders',
                        priority: 'medium',
                        title: 'Shoulder Alignment Improvement',
                        description: 'Balance shoulder muscles and improve posture awareness.',
                        exercises: [
                            'Shoulder blade squeezes',
                            'Wall slides',
                            'Doorway chest stretches',
                            'Posture mirror checks'
                        ]
                    });
                    break;
                case 'spine_misalignment':
                    recommendations.push({
                        category: 'spine',
                        priority: 'high',
                        title: 'Spinal Alignment Correction',
                        description: 'Strengthen core muscles and improve spinal mobility.',
                        exercises: [
                            'Core strengthening exercises',
                            'Cat-cow stretches',
                            'Spinal rotation exercises',
                            'Ergonomic seating assessment'
                        ]
                    });
                    break;
            }
        });

        return recommendations;
    }

    /**
     * Generate report summary
     * @param {Object} analysisResults - Analysis results
     * @returns {Object} Report summary
     */
    generateSummary(analysisResults) {
        const summary = {
            overallScore: analysisResults.overallScore,
            grade: this.getPostureGrade(analysisResults.overallScore),
            keyFindings: [],
            priorityActions: []
        };

        // Key findings
        if (analysisResults.strengths.length > 0) {
            summary.keyFindings.push(`Strengths: ${analysisResults.strengths.join(', ')}`);
        }

        if (analysisResults.issues.length > 0) {
            const highPriorityIssues = analysisResults.issues.filter(issue => issue.severity === 'high');
            if (highPriorityIssues.length > 0) {
                summary.keyFindings.push(`Critical areas: ${highPriorityIssues.map(issue => issue.type.replace('_', ' ')).join(', ')}`);
            }
        }

        // Priority actions
        const highPriorityRecommendations = this.generateRecommendations(analysisResults)
            .filter(rec => rec.priority === 'high')
            .slice(0, 3);
        
        summary.priorityActions = highPriorityRecommendations.map(rec => rec.title);

        return summary;
    }

    /**
     * Get posture grade based on score
     * @param {number} score - Overall posture score
     * @returns {string} Letter grade
     */
    getPostureGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * Generate report ID
     * @returns {string} Unique report ID
     */
    generateReportId() {
        return `posture_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create downloadable HTML report
     * @param {Object} reportData - Complete report data
     * @returns {Promise<Blob>} HTML report blob
     */
    async createHTMLReport(reportData = this.reportData) {
        if (!reportData) {
            throw new Error('No report data available');
        }

        const html = await this.generateHTMLContent(reportData);
        return new Blob([html], { type: 'text/html' });
    }

    /**
     * Generate HTML content for report
     * @param {Object} reportData - Report data
     * @returns {Promise<string>} HTML content
     */
    async generateHTMLContent(reportData) {
        const frontImageUrl = URL.createObjectURL(reportData.images.front);
        const sideImageUrl = URL.createObjectURL(reportData.images.side);
        
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Posturely - Posture Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #FFD045, #F9B52D); padding: 30px; text-align: center; color: #2B1E0F; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 800; }
        .header p { margin: 10px 0 0 0; opacity: 0.8; }
        .content { padding: 30px; }
        .score-section { text-align: center; margin-bottom: 30px; }
        .score-circle { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; color: white; }
        .score-excellent { background: #34C759; }
        .score-good { background: #007AFF; }
        .score-fair { background: #FFA000; }
        .score-poor { background: #EF4444; }
        .images-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
        .image-container { text-align: center; }
        .image-container img { width: 100%; max-width: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .image-container h3 { margin: 15px 0 5px 0; color: #333; }
        .analysis-section { margin: 30px 0; }
        .analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .analysis-item { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007AFF; }
        .analysis-item h4 { margin: 0 0 10px 0; color: #333; }
        .status-good { border-left-color: #34C759; }
        .status-fair { border-left-color: #FFA000; }
        .status-poor { border-left-color: #EF4444; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .recommendations h3 { margin: 0 0 15px 0; color: #1976d2; }
        .recommendation-item { margin: 15px 0; padding: 15px; background: white; border-radius: 6px; }
        .recommendation-item h4 { margin: 0 0 8px 0; color: #333; }
        .exercises { margin: 10px 0; }
        .exercises ul { margin: 5px 0; padding-left: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏃‍♂️ Posturely Posture Analysis Report</h1>
            <p>Generated on ${new Date(reportData.timestamp).toLocaleDateString()}</p>
        </div>
        
        <div class="content">
            <div class="score-section">
                <div class="score-circle ${this.getScoreClass(reportData.analysis.overallScore)}">
                    ${reportData.analysis.overallScore}
                </div>
                <h2>Overall Posture Grade: ${reportData.summary.grade}</h2>
                <p>${this.getScoreDescription(reportData.analysis.overallScore)}</p>
            </div>

            <div class="images-section">
                <div class="image-container">
                    <h3>Front View</h3>
                    <img src="${frontImageUrl}" alt="Front view posture analysis">
                </div>
                <div class="image-container">
                    <h3>Side View</h3>
                    <img src="${sideImageUrl}" alt="Side view posture analysis">
                </div>
            </div>

            <div class="analysis-section">
                <h2>Detailed Analysis</h2>
                <div class="analysis-grid">
                    ${this.generateAnalysisHTML(reportData.analysis)}
                </div>
            </div>

            <div class="recommendations">
                <h3>📋 Personalized Recommendations</h3>
                ${reportData.recommendations.map(rec => `
                    <div class="recommendation-item">
                        <h4>${rec.title}</h4>
                        <p>${rec.description}</p>
                        <div class="exercises">
                            <strong>Recommended exercises:</strong>
                            <ul>
                                ${rec.exercises.map(ex => `<li>${ex}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="summary">
                <h3>📊 Key Findings</h3>
                <ul>
                    ${reportData.summary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
                </ul>
                
                <h3>🎯 Priority Actions</h3>
                <ul>
                    ${reportData.summary.priorityActions.map(action => `<li>${action}</li>`).join('')}
                </ul>
            </div>
        </div>

        <div class="footer">
            <p>Report generated by Posturely Chrome Extension v${reportData.metadata.version}</p>
            <p>For best results, perform regular posture assessments and follow the recommendations.</p>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * Generate analysis HTML sections
     * @param {Object} analysis - Analysis data
     * @returns {string} HTML content
     */
    generateAnalysisHTML(analysis) {
        const sections = [];

        // Front view analysis
        if (analysis.frontView.shoulderAlignment) {
            sections.push(`
                <div class="analysis-item status-${analysis.frontView.shoulderAlignment.status}">
                    <h4>Shoulder Alignment</h4>
                    <p>Angle: ${analysis.frontView.shoulderAlignment.angle.toFixed(1)}°</p>
                    <p>Score: ${analysis.frontView.shoulderAlignment.score}/100</p>
                    <p>Status: ${analysis.frontView.shoulderAlignment.status.toUpperCase()}</p>
                </div>
            `);
        }

        if (analysis.frontView.hipAlignment) {
            sections.push(`
                <div class="analysis-item status-${analysis.frontView.hipAlignment.status}">
                    <h4>Hip Alignment</h4>
                    <p>Angle: ${analysis.frontView.hipAlignment.angle.toFixed(1)}°</p>
                    <p>Score: ${analysis.frontView.hipAlignment.score}/100</p>
                    <p>Status: ${analysis.frontView.hipAlignment.status.toUpperCase()}</p>
                </div>
            `);
        }

        // Side view analysis
        if (analysis.sideView.neckAngle) {
            sections.push(`
                <div class="analysis-item status-${analysis.sideView.neckAngle.status}">
                    <h4>Neck Angle</h4>
                    <p>Angle: ${analysis.sideView.neckAngle.angle.toFixed(1)}°</p>
                    <p>Score: ${analysis.sideView.neckAngle.score}/100</p>
                    <p>Status: ${analysis.sideView.neckAngle.status.toUpperCase()}</p>
                </div>
            `);
        }

        if (analysis.sideView.spineAlignment) {
            sections.push(`
                <div class="analysis-item status-${analysis.sideView.spineAlignment.status}">
                    <h4>Spine Alignment</h4>
                    <p>Angle: ${analysis.sideView.spineAlignment.angle.toFixed(1)}°</p>
                    <p>Score: ${analysis.sideView.spineAlignment.score}/100</p>
                    <p>Status: ${analysis.sideView.spineAlignment.status.toUpperCase()}</p>
                </div>
            `);
        }

        return sections.join('');
    }

    /**
     * Get CSS class for score
     * @param {number} score - Posture score
     * @returns {string} CSS class name
     */
    getScoreClass(score) {
        if (score >= 90) return 'score-excellent';
        if (score >= 70) return 'score-good';
        if (score >= 50) return 'score-fair';
        return 'score-poor';
    }

    /**
     * Get score description
     * @param {number} score - Posture score
     * @returns {string} Description
     */
    getScoreDescription(score) {
        if (score >= 90) return 'Excellent posture! Keep up the great work.';
        if (score >= 70) return 'Good posture with room for minor improvements.';
        if (score >= 50) return 'Fair posture. Focus on the recommended improvements.';
        return 'Poor posture detected. Please follow the recommendations carefully.';
    }

    /**
     * Download report as HTML file
     * @param {string} filename - Optional filename
     */
    async downloadHTMLReport(filename = null) {
        if (!this.reportData) {
            throw new Error('No report data available for download');
        }

        const htmlBlob = await this.createHTMLReport();
        const url = URL.createObjectURL(htmlBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `posturely-report-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        console.log('📄 HTML report downloaded successfully');
    }

    /**
     * Get current report data
     * @returns {Object} Current report data
     */
    getReportData() {
        return this.reportData;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.reportData && this.reportData.images) {
            if (this.reportData.images.front) {
                URL.revokeObjectURL(this.reportData.images.front);
            }
            if (this.reportData.images.side) {
                URL.revokeObjectURL(this.reportData.images.side);
            }
        }
        
        this.reportData = null;
        this.analysisResults = null;
    }
}