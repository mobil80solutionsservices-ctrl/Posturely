/**
 * AIReportGenerator - Integrates with Chrome AI Summarizer for report generation
 * Creates friendly posture reports with Summary and Motivation sections
 */
export class AIReportGenerator {
    constructor() {
        this.summarizer = null;
        this.isInitialized = false;
        console.log('🤖 AIReportGenerator created');
    }
    
    /**
     * Initialize Chrome AI Summarizer
     * @returns {Promise<boolean>} True if initialization successful
     */
    async initialize() {
        try {
            console.log('🔄 Initializing Chrome AI Summarizer...');
            
            // Check if Chrome AI is available
            if (!window.ai || !window.ai.summarizer) {
                console.warn('⚠️ Chrome AI Summarizer not available, using fallback');
                return false;
            }
            
            // Initialize the summarizer
            this.summarizer = await window.ai.summarizer.create({
                type: 'key-points',
                format: 'markdown',
                length: 'medium'
            });
            
            this.isInitialized = true;
            console.log('✅ Chrome AI Summarizer initialized');
            return true;
        } catch (error) {
            console.warn('⚠️ Failed to initialize Chrome AI Summarizer:', error);
            this.isInitialized = false;
            return false;
        }
    }
    
    /**
     * Generate friendly posture report
     * @param {Object} postureMetrics - Posture analysis results
     * @returns {Promise<string>} Generated report HTML
     */
    async generateReport(postureMetrics) {
        if (this.isInitialized && this.summarizer) {
            return await this.generateAIReport(postureMetrics);
        } else {
            return this.generateFallbackReport(postureMetrics);
        }
    }
    
    /**
     * Generate AI-powered report using Chrome AI Summarizer
     * @param {Object} postureMetrics - Posture analysis results
     * @returns {Promise<string>} AI-generated report
     */
    async generateAIReport(postureMetrics) {
        try {
            const prompt = this.createReportPrompt(postureMetrics);
            const aiResponse = await this.summarizer.summarize(prompt);
            
            return this.formatAIResponse(aiResponse);
        } catch (error) {
            console.error('❌ AI report generation failed:', error);
            return this.generateFallbackReport(postureMetrics);
        }
    }
    
    /**
     * Create AI prompt for report generation
     * @param {Object} metrics - Posture metrics
     * @returns {string} Formatted prompt for AI
     */
    createReportPrompt(metrics) {
        return `
Analyze this posture scan data and create a friendly, encouraging report with two sections:

POSTURE DATA:
- Neck Tilt: ${metrics.neckTilt.toFixed(1)} degrees (normal: 0-10°)
- Shoulder Tilt: ${metrics.shoulderTilt.toFixed(1)} degrees (normal: 0-5°)
- Spine Angle: ${metrics.spineAngle.toFixed(1)} degrees (normal: 0-8°)
- Slouch Score: ${metrics.slouchCount.toFixed(1)}/100 (normal: 0-20)
- Overall Score: ${metrics.postureScore}/100

Create a report with exactly these two sections:

## Summary
Provide a brief, friendly analysis of the posture data. Mention specific areas that are good and areas that need attention. Use simple, non-technical language.

## Motivation
Provide encouraging, actionable advice for improving posture. Include 2-3 specific tips or exercises. Keep it positive and motivating.

Use a warm, supportive tone throughout. Focus on progress and improvement rather than problems.
        `.trim();
    }
    
    /**
     * Format AI response into proper HTML
     * @param {string} aiResponse - Raw AI response
     * @returns {string} Formatted HTML
     */
    formatAIResponse(aiResponse) {
        // Convert markdown-style headers to HTML
        let formatted = aiResponse
            .replace(/## Summary/g, '<h4 style="color: var(--text); margin: 0 0 8px 0;">📋 Summary</h4>')
            .replace(/## Motivation/g, '<h4 style="color: var(--text); margin: 16px 0 8px 0;">💪 Motivation</h4>')
            .replace(/\n\n/g, '</p><p style="margin: 8px 0; line-height: 1.5;">')
            .replace(/\n/g, '<br>');
        
        // Wrap in paragraph tags
        if (!formatted.startsWith('<h4>')) {
            formatted = '<p style="margin: 8px 0; line-height: 1.5;">' + formatted;
        }
        if (!formatted.endsWith('</p>')) {
            formatted += '</p>';
        }
        
        return formatted;
    }
    
    /**
     * Generate fallback report when AI is not available
     * @param {Object} postureMetrics - Posture analysis results
     * @returns {string} Fallback report HTML
     */
    generateFallbackReport(postureMetrics) {
        const { neckTilt, shoulderTilt, spineAngle, slouchCount, postureScore } = postureMetrics;
        
        // Determine overall assessment
        let overallAssessment = '';
        let recommendations = [];
        
        if (postureScore >= 85) {
            overallAssessment = 'Excellent posture! Your alignment looks great across all measurements.';
            recommendations.push('Keep up the great work with your current posture habits.');
            recommendations.push('Consider regular movement breaks to maintain this excellent posture.');
        } else if (postureScore >= 70) {
            overallAssessment = 'Good posture with some areas for improvement.';
            if (neckTilt > 10) recommendations.push('Focus on keeping your head aligned over your shoulders.');
            if (shoulderTilt > 5) recommendations.push('Work on shoulder alignment with gentle stretches.');
            if (spineAngle > 8) recommendations.push('Practice sitting or standing with a straight spine.');
        } else {
            overallAssessment = 'Your posture could benefit from some attention and improvement.';
            if (neckTilt > 15) recommendations.push('Try chin tucks to reduce forward head posture.');
            if (shoulderTilt > 8) recommendations.push('Strengthen your core and back muscles for better shoulder alignment.');
            if (slouchCount > 30) recommendations.push('Set reminders to check and correct your posture throughout the day.');
        }
        
        // Add general recommendations if none specific
        if (recommendations.length === 0) {
            recommendations.push('Take regular breaks to stand and stretch.');
            recommendations.push('Consider ergonomic adjustments to your workspace.');
        }
        
        return `
            <h4 style="color: var(--text); margin: 0 0 8px 0;">📋 Summary</h4>
            <p style="margin: 8px 0; line-height: 1.5;">${overallAssessment}</p>
            
            <h4 style="color: var(--text); margin: 16px 0 8px 0;">💪 Motivation</h4>
            <p style="margin: 8px 0; line-height: 1.5;">
                Every small improvement in posture contributes to better health and confidence. Here are some ways to enhance your posture:
            </p>
            <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.5;">
                ${recommendations.map(rec => `<li style="margin: 4px 0;">${rec}</li>`).join('')}
            </ul>
            <p style="margin: 8px 0; line-height: 1.5;">
                Remember, building better posture is a journey. Be patient with yourself and celebrate small improvements!
            </p>
        `;
    }
    
    /**
     * Clean up resources
     */
    async cleanup() {
        if (this.summarizer) {
            try {
                await this.summarizer.destroy();
                this.summarizer = null;
                this.isInitialized = false;
                console.log('🧹 AI Summarizer cleaned up');
            } catch (error) {
                console.warn('⚠️ Error cleaning up AI Summarizer:', error);
            }
        }
    }
}