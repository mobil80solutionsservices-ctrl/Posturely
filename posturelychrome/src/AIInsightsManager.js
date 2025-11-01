/**
 * AIInsightsManager - Generates dynamic insights using Chrome AI Summarizer API
 * Creates personalized posture insights based on user data and tracking patterns
 */
export class AIInsightsManager {
    constructor() {
        this.summarizerSession = null;
        this.isInitialized = false;
        this.fallbackInsights = [
            { icon: '💡', text: 'Track consistently to unlock personalized insights about your posture patterns.' },
            { icon: '🎯', text: 'Aim for 60+ minutes of daily tracking for optimal posture monitoring.' },
            { icon: '📊', text: 'Regular posture breaks help maintain good habits throughout the day.' }
        ];
    }

    /**
     * Initialize the AI Insights Manager and check API availability
     */
    async initialize() {
        try {
            // Check if Summarizer API is available
            if (typeof window.Summarizer === 'undefined') {
                console.warn('Chrome AI Summarizer API not available - using fallback insights');
                return false;
            }

            // Check device support
            const availability = await window.Summarizer.availability();
            if (availability === 'unavailable') {
                console.warn('Device does not support Summarizer API - using fallback insights');
                return false;
            }

            // Create summarizer session
            this.summarizerSession = await window.Summarizer.create({
                type: 'tldr',
                format: 'plain-text',
                length: 'short'
            });

            this.isInitialized = true;
            console.log('AI Insights Manager initialized successfully');
            return true;

        } catch (error) {
            console.warn('Failed to initialize AI Insights Manager:', error);
            return false;
        }
    }

    /**
     * Generate AI-powered insights based on user data
     */
    async generateInsights(date, dayRecord, weeklyStats = null, monthlyStats = null) {
        try {
            // If AI is not available, use fallback insights
            if (!this.isInitialized || !this.summarizerSession) {
                return this.generateFallbackInsights(date, dayRecord);
            }

            // Prepare data context for AI analysis
            const dataContext = this.prepareDataContext(date, dayRecord, weeklyStats, monthlyStats);
            
            // Generate AI insights
            const aiInsights = await this.generateAIInsights(dataContext);
            
            // Combine with some static insights for variety
            const combinedInsights = this.combineInsights(aiInsights, dayRecord);
            
            return combinedInsights;

        } catch (error) {
            console.warn('Error generating AI insights, falling back to static insights:', error);
            return this.generateFallbackInsights(date, dayRecord);
        }
    }

    /**
     * Prepare structured data context for AI analysis
     */
    prepareDataContext(date, dayRecord, weeklyStats, monthlyStats) {
        const totalMinutes = dayRecord.minutes || 0;
        const averageScore = dayRecord.samples > 0 ? Math.round(dayRecord.scoreSum / dayRecord.samples) : 0;
        const sessions = dayRecord.sessions || [];
        const dayOfWeek = date.getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return {
            date: {
                day: dayNames[dayOfWeek],
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
                isToday: date.toDateString() === new Date().toDateString()
            },
            tracking: {
                totalMinutes,
                sessionCount: sessions.length,
                averageScore,
                hasData: totalMinutes > 0,
                meetsGoal: totalMinutes >= 60
            },
            weekly: weeklyStats || {
                totalMinutes: totalMinutes,
                averageScore: averageScore,
                activeDays: totalMinutes > 0 ? 1 : 0
            },
            monthly: monthlyStats || {
                totalMinutes: totalMinutes,
                averageScore: averageScore,
                activeDays: totalMinutes > 0 ? 1 : 0
            }
        };
    }

    /**
     * Generate insights using Chrome AI Summarizer API
     */
    async generateAIInsights(dataContext) {
        try {
            // Create a structured prompt for the AI
            const prompt = this.createInsightPrompt(dataContext);
            
            // Generate summary/insights using AI
            const aiResponse = await this.summarizerSession.summarize(prompt);
            
            // Parse AI response into structured insights
            return this.parseAIResponse(aiResponse, dataContext);

        } catch (error) {
            console.warn('AI insight generation failed:', error);
            return [];
        }
    }

    /**
     * Create a structured prompt for AI insight generation
     */
    createInsightPrompt(dataContext) {
        const { date, tracking, weekly, monthly } = dataContext;
        
        return `Posture Tracking Analysis for ${date.day}:

Current Day Performance:
- Tracking time: ${this.formatDuration(tracking.totalMinutes)}
- Sessions completed: ${tracking.sessionCount}
- Average posture score: ${tracking.averageScore}/100
- Goal achievement: ${tracking.meetsGoal ? 'Met 60-minute goal' : 'Below 60-minute goal'}

Weekly Context:
- Total weekly minutes: ${this.formatDuration(weekly.totalMinutes)}
- Weekly average score: ${weekly.averageScore}/100
- Active days this week: ${weekly.activeDays}

Monthly Context:
- Total monthly minutes: ${this.formatDuration(monthly.totalMinutes)}
- Monthly average score: ${monthly.averageScore}/100
- Active days this month: ${monthly.activeDays}

Generate 2-3 brief, encouraging insights about posture tracking progress, habits, and recommendations. Focus on positive reinforcement and actionable advice. Keep each insight under 80 characters.`;
    }

    /**
     * Parse AI response and convert to structured insights
     */
    parseAIResponse(aiResponse, dataContext) {
        try {
            const insights = [];
            
            // Split AI response into sentences/points
            const sentences = aiResponse.split(/[.!]\s+/).filter(s => s.trim().length > 10);
            
            // Convert to insight objects with appropriate icons
            sentences.slice(0, 3).forEach((sentence, index) => {
                const cleanText = sentence.trim().replace(/[.!]*$/, '');
                if (cleanText.length > 0) {
                    insights.push({
                        icon: this.selectInsightIcon(cleanText, index, dataContext),
                        text: cleanText
                    });
                }
            });

            // Ensure we have at least 2 insights
            if (insights.length < 2) {
                insights.push(...this.generateFallbackInsights(null, dataContext.tracking).slice(0, 2 - insights.length));
            }

            return insights;

        } catch (error) {
            console.warn('Error parsing AI response:', error);
            return [];
        }
    }

    /**
     * Select appropriate icon based on insight content
     */
    selectInsightIcon(text, index, dataContext) {
        const lowerText = text.toLowerCase();
        
        // Score-related insights
        if (lowerText.includes('score') || lowerText.includes('excellent') || lowerText.includes('good')) {
            return dataContext.tracking.averageScore >= 80 ? '✨' : '👍';
        }
        
        // Time/duration insights
        if (lowerText.includes('minute') || lowerText.includes('time') || lowerText.includes('track')) {
            return dataContext.tracking.meetsGoal ? '🎯' : '📈';
        }
        
        // Session/consistency insights
        if (lowerText.includes('session') || lowerText.includes('consistent') || lowerText.includes('regular')) {
            return '⏰';
        }
        
        // Goal/achievement insights
        if (lowerText.includes('goal') || lowerText.includes('achieve') || lowerText.includes('target')) {
            return '🎯';
        }
        
        // Improvement/progress insights
        if (lowerText.includes('improve') || lowerText.includes('progress') || lowerText.includes('better')) {
            return '📈';
        }
        
        // Default icons based on position
        const defaultIcons = ['💡', '📊', '🚀'];
        return defaultIcons[index % defaultIcons.length];
    }

    /**
     * Combine AI insights with static insights for variety
     */
    combineInsights(aiInsights, dayRecord) {
        const insights = [...aiInsights];
        
        // Add a static insight if we have room
        if (insights.length < 3) {
            const staticInsight = this.getContextualStaticInsight(dayRecord);
            if (staticInsight) {
                insights.push(staticInsight);
            }
        }
        
        return insights.slice(0, 3); // Limit to 3 insights
    }

    /**
     * Get contextual static insight based on data
     */
    getContextualStaticInsight(dayRecord) {
        const totalMinutes = dayRecord.minutes || 0;
        const sessions = dayRecord.sessions || [];
        const now = new Date();
        const hour = now.getHours();
        
        // Time-based insights
        if (hour < 12) {
            return { icon: '🌅', text: 'Morning tracking helps establish good posture habits for the day.' };
        } else if (hour > 17) {
            return { icon: '🌆', text: 'Evening sessions help you wind down with better posture awareness.' };
        }
        
        // Session-based insights
        if (sessions.length > 3) {
            return { icon: '🔄', text: 'Multiple short sessions are great for maintaining posture awareness.' };
        }
        
        // Default motivational insight
        return { icon: '💪', text: 'Every minute of tracking contributes to better posture habits.' };
    }

    /**
     * Generate fallback insights when AI is not available
     */
    generateFallbackInsights(date, dayRecord) {
        const insights = [];
        const totalMinutes = dayRecord.minutes || 0;
        const averageScore = dayRecord.samples > 0 ? Math.round(dayRecord.scoreSum / dayRecord.samples) : 0;
        const sessions = dayRecord.sessions || [];

        // Day-specific insights
        if (totalMinutes === 0) {
            insights.push({
                icon: '💡',
                text: 'No tracking data for this day. Start a session to begin monitoring your posture!'
            });
        } else {
            if (totalMinutes >= 60) {
                insights.push({
                    icon: '🎯',
                    text: `Great job! You tracked ${this.formatDuration(totalMinutes)} - exceeding the daily goal.`
                });
            } else {
                insights.push({
                    icon: '📈',
                    text: `You tracked ${this.formatDuration(totalMinutes)}. Try to reach 60 minutes daily for optimal results.`
                });
            }

            if (averageScore >= 80) {
                insights.push({
                    icon: '✨',
                    text: `Excellent posture score of ${averageScore}! Keep up the great work.`
                });
            } else if (averageScore >= 60) {
                insights.push({
                    icon: '👍',
                    text: `Good posture score of ${averageScore}. Small improvements can make a big difference.`
                });
            } else if (averageScore > 0) {
                insights.push({
                    icon: '💪',
                    text: `Posture score of ${averageScore} shows room for improvement. Focus on sitting up straight.`
                });
            }

            if (sessions.length > 1) {
                insights.push({
                    icon: '⏰',
                    text: `${sessions.length} sessions today shows good consistency. Breaking up work helps maintain focus.`
                });
            }
        }

        // Ensure we have at least 2 insights
        while (insights.length < 2) {
            insights.push(...this.fallbackInsights.slice(0, 2 - insights.length));
        }

        return insights.slice(0, 3); // Limit to 3 insights
    }

    /**
     * Format duration in a user-friendly way
     */
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    /**
     * Check if AI insights are available
     */
    isAIAvailable() {
        return this.isInitialized && this.summarizerSession !== null;
    }

    /**
     * Get API status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            apiAvailable: typeof window.Summarizer !== 'undefined',
            sessionActive: this.summarizerSession !== null
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.summarizerSession) {
            try {
                // Note: Summarizer API may not have explicit cleanup method
                this.summarizerSession = null;
            } catch (error) {
                console.warn('Error during cleanup:', error);
            }
        }
        this.isInitialized = false;
    }
}