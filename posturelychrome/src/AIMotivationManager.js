/**
 * AIMotivationManager - Generates dynamic summaries and motivational messages
 * Uses Chrome AI Summarizer API for summaries and Writer API for motivation
 */
export class AIMotivationManager {
    constructor() {
        this.summarizerSession = null;
        this.writerSession = null;
        this.isInitialized = false;
        this.updateInterval = null;
        this.sessionStartTime = null;
        this.lastUpdateTime = null;
        

    }

    /**
     * Initialize the AI Motivation Manager
     */
    async initialize() {
        try {
            let summarizerAvailable = false;
            let writerAvailable = false;

            // Initialize Summarizer API
            if (typeof window.Summarizer !== 'undefined') {
                try {
                    const summarizerAvailability = await window.Summarizer.availability();
                    if (summarizerAvailability !== 'unavailable') {
                        this.summarizerSession = await window.Summarizer.create({
                            type: 'tldr',
                            format: 'plain-text',
                            length: 'short'
                        });
                        summarizerAvailable = true;
                        console.log('✅ Summarizer API initialized successfully');
                    }
                } catch (error) {
                    console.warn('Failed to initialize Summarizer API:', error);
                }
            }

            // Initialize Writer API (Language Model)
            if (typeof window.LanguageModel !== 'undefined') {
                try {
                    const writerAvailability = await window.LanguageModel.availability();
                    if (writerAvailability !== 'unavailable') {
                        this.writerSession = await window.LanguageModel.create({
                            temperature: 0.8,
                            topK: 3
                        });
                        writerAvailable = true;
                        console.log('✅ Writer API initialized successfully');
                    }
                } catch (error) {
                    console.warn('Failed to initialize Writer API:', error);
                }
            }

            this.isInitialized = summarizerAvailable && writerAvailable;
            
            if (this.isInitialized) {
                console.log(`🤖 AI Motivation Manager initialized successfully - Both APIs available`);
            } else {
                console.warn(`⚠️ AI Motivation Manager initialization failed - Summarizer: ${summarizerAvailable ? '✅' : '❌'}, Writer: ${writerAvailable ? '✅' : '❌'}`);
                console.warn('Both Summarizer and Writer APIs are required for AI motivation features');
            }

            return this.isInitialized;

        } catch (error) {
            console.warn('Failed to initialize AI Motivation Manager:', error);
            return false;
        }
    }

    /**
     * Start tracking session and begin periodic updates
     */
    startSession() {
        if (!this.isInitialized) {
            console.error('❌ Cannot start AI motivation session - APIs not available');
            return;
        }
        
        this.sessionStartTime = new Date();
        this.lastUpdateTime = new Date();
        
        // Generate initial summary and motivation
        this.updateSummaryAndMotivation();
        
        // Set up periodic updates every 10 minutes (600,000 ms)
        this.updateInterval = setInterval(() => {
            this.updateSummaryAndMotivation();
        }, 10 * 60 * 1000);
        
        console.log('🚀 AI Motivation session started - updates every 10 minutes');
    }

    /**
     * Stop tracking session and clear intervals
     */
    stopSession() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.sessionStartTime = null;
        this.lastUpdateTime = null;
        
        console.log('⏹️ AI Motivation session stopped');
    }

    /**
     * Update both summary and motivation messages
     */
    async updateSummaryAndMotivation() {
        try {
            const sessionData = this.getSessionData();
            
            // Update summary and motivation in parallel
            const [summary, motivation] = await Promise.all([
                this.generateSummary(sessionData),
                this.generateMotivation(sessionData)
            ]);
            
            // Only update UI if we have AI-generated content
            if (summary) {
                this.updateSummaryUI(summary);
            } else {
                console.warn('No AI summary generated - keeping existing content');
            }
            
            if (motivation) {
                this.updateMotivationUI(motivation);
            } else {
                console.warn('No AI motivation generated - keeping existing content');
            }
            
            this.lastUpdateTime = new Date();
            
        } catch (error) {
            console.error('Error updating summary and motivation:', error);
            // Don't use fallbacks - just log the error
        }
    }

    /**
     * Generate AI-powered summary using Summarizer API
     */
    async generateSummary(sessionData) {
        if (!this.summarizerSession) {
            console.warn('Summarizer API not available - skipping summary generation');
            return null;
        }

        try {
            // Create context for summarization
            const context = this.createSummaryContext(sessionData);
            
            // Generate summary using AI
            const aiSummary = await this.summarizerSession.summarize(context);
            
            // Clean and format the summary
            const cleanSummary = this.cleanSummaryText(aiSummary);
            
            if (!cleanSummary) {
                console.warn('AI summary generation returned empty result');
                return null;
            }
            
            console.log('✅ AI Summary generated:', cleanSummary);
            return cleanSummary;

        } catch (error) {
            console.error('AI summary generation failed:', error);
            return null;
        }
    }

    /**
     * Generate AI-powered motivation using Writer API
     */
    async generateMotivation(sessionData) {
        if (!this.writerSession) {
            console.warn('Writer API not available - skipping motivation generation');
            return null;
        }

        try {
            // Create prompt for motivation generation
            const prompt = this.createMotivationPrompt(sessionData);
            
            // Generate motivation using AI
            const aiMotivation = await this.writerSession.prompt(prompt);
            
            // Clean and format the motivation
            const cleanMotivation = this.cleanMotivationText(aiMotivation);
            
            if (!cleanMotivation) {
                console.warn('AI motivation generation returned empty result');
                return null;
            }
            
            console.log('✅ AI Motivation generated:', cleanMotivation);
            return cleanMotivation;

        } catch (error) {
            console.error('AI motivation generation failed:', error);
            return null;
        }
    }

    /**
     * Get current session data for AI context
     */
    getSessionData() {
        const now = new Date();
        const sessionDuration = this.sessionStartTime ? Math.floor((now - this.sessionStartTime) / 1000 / 60) : 0;
        const timeSinceUpdate = this.lastUpdateTime ? Math.floor((now - this.lastUpdateTime) / 1000 / 60) : 0;
        
        // Get current posture score if available
        const scoreElement = document.getElementById('scoreValue');
        const currentScore = scoreElement ? parseInt(scoreElement.textContent) || 0 : 0;
        
        // Get today's tracking data from storage (simplified)
        const todayMinutes = this.getTodayTrackingMinutes();
        
        return {
            sessionDuration,
            timeSinceUpdate,
            currentScore,
            todayMinutes,
            timeOfDay: this.getTimeOfDay(),
            isFirstUpdate: timeSinceUpdate === 0
        };
    }

    /**
     * Create context for AI summarization
     */
    createSummaryContext(sessionData) {
        const { sessionDuration, currentScore, todayMinutes, timeOfDay, isFirstUpdate } = sessionData;
        
        if (isFirstUpdate) {
            return `Posture Tracking Session Started:
- Session just began
- Current posture score: ${currentScore}/100
- Today's total tracking: ${todayMinutes} minutes
- Time of day: ${timeOfDay}
- User is starting a new posture monitoring session

Provide a brief, encouraging summary about starting this posture tracking session. Keep it under 60 characters and focus on the positive aspects of maintaining good posture habits.`;
        } else {
            return `Posture Tracking Session Update:
- Session duration: ${sessionDuration} minutes
- Current posture score: ${currentScore}/100
- Today's total tracking: ${todayMinutes} minutes
- Time of day: ${timeOfDay}
- User has been actively monitoring their posture

Provide a brief, encouraging summary of the posture tracking progress so far. Keep it under 60 characters and highlight improvements or consistency.`;
        }
    }

    /**
     * Create prompt for AI motivation generation
     */
    createMotivationPrompt(sessionData) {
        const { sessionDuration, currentScore, todayMinutes, timeOfDay, isFirstUpdate } = sessionData;
        
        return `Generate a short, encouraging motivational message for someone tracking their posture:

Context:
- Session duration: ${sessionDuration} minutes
- Current posture score: ${currentScore}/100
- Today's total tracking: ${todayMinutes} minutes
- Time of day: ${timeOfDay}
- First message: ${isFirstUpdate}

Requirements:
- Keep it under 50 characters
- Be positive and encouraging
- Include an emoji at the start
- Focus on building good habits
- Make it personal and motivating

Examples: "🌟 Great posture awareness today!" or "💪 Building fantastic habits!"`;
    }

    /**
     * Clean and format summary text
     */
    cleanSummaryText(text) {
        if (!text || typeof text !== 'string') return null;
        
        // Remove quotes, clean up formatting
        let cleaned = text.trim()
            .replace(/^["']|["']$/g, '')
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ');
        
        // Ensure it's not too long
        if (cleaned.length > 80) {
            cleaned = cleaned.substring(0, 77) + '...';
        }
        
        // Ensure it ends with proper punctuation
        if (!/[.!?]$/.test(cleaned)) {
            cleaned += '.';
        }
        
        return cleaned;
    }

    /**
     * Clean and format motivation text
     */
    cleanMotivationText(text) {
        if (!text || typeof text !== 'string') return null;
        
        // Remove quotes, clean up formatting
        let cleaned = text.trim()
            .replace(/^["']|["']$/g, '')
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ');
        
        // Ensure it starts with an emoji if it doesn't have one
        if (!/^[\u{1F300}-\u{1F9FF}]/u.test(cleaned)) {
            const emojis = ['🌟', '💪', '🎯', '🚀', '✨', '🔥', '👍', '💯'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            cleaned = `${randomEmoji} ${cleaned}`;
        }
        
        // Ensure it's not too long
        if (cleaned.length > 60) {
            cleaned = cleaned.substring(0, 57) + '...';
        }
        
        return cleaned;
    }

    /**
     * Extract emoji from motivation text for the icon
     */
    extractEmojiFromMotivation(motivation) {
        if (!motivation) return '💡';
        
        // Extract the first emoji from the motivation text
        const emojiMatch = motivation.match(/[\u{1F300}-\u{1F9FF}]/u);
        return emojiMatch ? emojiMatch[0] : '💡';
    }

    /**
     * Update summary UI element
     */
    updateSummaryUI(summary) {
        const summaryElement = document.querySelector('#summaryBlock .section-text');
        if (summaryElement) {
            summaryElement.textContent = summary;
            
            // Show the summary block if it's hidden
            const summaryBlock = document.getElementById('summaryBlock');
            if (summaryBlock) {
                summaryBlock.classList.remove('hidden');
            }
        }
    }

    /**
     * Update motivation UI element
     */
    updateMotivationUI(motivation) {
        const motivationElement = document.querySelector('#motivationBlock .section-text');
        const motivationIcon = document.querySelector('#motivationBlock .motivation-icon');
        
        if (motivationElement) {
            motivationElement.textContent = motivation;
            
            // Update the motivation icon based on content
            if (motivationIcon) {
                const emoji = this.extractEmojiFromMotivation(motivation);
                motivationIcon.textContent = emoji;
            }
            
            // Show the motivation block if it's hidden
            const motivationBlock = document.getElementById('motivationBlock');
            if (motivationBlock) {
                motivationBlock.classList.remove('hidden');
            }
        }
    }



    /**
     * Get time of day description
     */
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 12) return 'morning';
        if (hour < 17) return 'afternoon';
        return 'evening';
    }

    /**
     * Get today's tracking minutes from current session
     */
    getTodayTrackingMinutes() {
        // Get session duration in minutes
        const sessionDuration = this.sessionStartTime ? Math.floor((new Date() - this.sessionStartTime) / 1000 / 60) : 0;
        
        // Try to get additional data from storage if available
        try {
            // This could be enhanced to get actual daily totals from storage
            return sessionDuration;
        } catch (error) {
            return sessionDuration;
        }
    }

    /**
     * Check if AI features are available
     */
    isAIAvailable() {
        return this.isInitialized && (this.summarizerSession || this.writerSession);
    }

    /**
     * Get status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            summarizerAvailable: this.summarizerSession !== null,
            writerAvailable: this.writerSession !== null,
            sessionActive: this.updateInterval !== null,
            sessionDuration: this.sessionStartTime ? Math.floor((new Date() - this.sessionStartTime) / 1000 / 60) : 0
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        this.stopSession();
        
        try {
            // Note: Chrome AI APIs may not have explicit cleanup methods
            this.summarizerSession = null;
            this.writerSession = null;
        } catch (error) {
            console.warn('Error during cleanup:', error);
        }
        
        this.isInitialized = false;
    }
}