/**
 * DataIntegrityValidator - Ensures accurate data display and prevents UI duplication
 * Validates analytics data before display and fixes incomplete data issues
 */
export class DataIntegrityValidator {
    constructor() {
        this.validationRules = {
            minutes: (value) => typeof value === 'number' && value >= 0,
            scoreSum: (value) => typeof value === 'number' && value >= 0,
            samples: (value) => typeof value === 'number' && value >= 0,
            sessions: (value) => Array.isArray(value),
            notes: (value) => typeof value === 'string'
        };
    }

    /**
     * Validate analytics data before display
     */
    validateAnalyticsData(data) {
        if (!data || typeof data !== 'object') {
            console.warn('Invalid analytics data provided:', data);
            return this.createEmptyRecord();
        }

        const validated = {};
        
        // Validate each field with default fallbacks
        validated.minutes = this.validationRules.minutes(data.minutes) ? data.minutes : 0;
        validated.scoreSum = this.validationRules.scoreSum(data.scoreSum) ? data.scoreSum : 0;
        validated.samples = this.validationRules.samples(data.samples) ? data.samples : 0;
        validated.sessions = this.validationRules.sessions(data.sessions) ? data.sessions : [];
        validated.notes = this.validationRules.notes(data.notes) ? data.notes : '';

        // Validate session data
        validated.sessions = validated.sessions.map(session => this.validateSession(session));

        // Recalculate totals from sessions if they don't match
        const calculatedMinutes = validated.sessions.reduce((sum, session) => sum + (session.minutes || 0), 0);
        
        // If there's a significant discrepancy, use calculated values
        if (Math.abs(validated.minutes - calculatedMinutes) > 1) {
            console.warn(`Minutes mismatch detected. Stored: ${validated.minutes}, Calculated: ${calculatedMinutes}`);
            validated.minutes = calculatedMinutes;
        }

        return validated;
    }

    /**
     * Validate individual session data
     */
    validateSession(session) {
        if (!session || typeof session !== 'object') {
            return this.createEmptySession();
        }

        return {
            id: session.id || Date.now().toString(),
            startTime: this.validateTimeString(session.startTime),
            endTime: this.validateTimeString(session.endTime),
            minutes: typeof session.minutes === 'number' && session.minutes >= 0 ? session.minutes : 0,
            avgScore: typeof session.avgScore === 'number' && session.avgScore >= 0 ? session.avgScore : 0,
            mood: typeof session.mood === 'string' ? session.mood : '',
            moodTimestamp: session.moodTimestamp || null
        };
    }

    /**
     * Validate time string format
     */
    validateTimeString(timeString) {
        if (!timeString) return null;
        
        try {
            const date = new Date(timeString);
            if (isNaN(date.getTime())) {
                return null;
            }
            return timeString;
        } catch (error) {
            console.warn('Invalid time string:', timeString);
            return null;
        }
    }

    /**
     * Check daily minutes accuracy
     */
    validateDailyMinutes(trackingData) {
        if (!trackingData || typeof trackingData !== 'object') {
            return { isValid: false, correctedMinutes: 0, issues: ['Invalid tracking data'] };
        }

        const issues = [];
        const sessions = trackingData.sessions || [];
        const storedMinutes = trackingData.minutes || 0;
        
        // Calculate minutes from sessions
        let calculatedMinutes = 0;
        let validSessions = 0;

        sessions.forEach((session, index) => {
            if (session && typeof session.minutes === 'number' && session.minutes >= 0) {
                calculatedMinutes += session.minutes;
                validSessions++;
            } else {
                issues.push(`Session ${index + 1} has invalid minutes data`);
            }
        });

        // Check for discrepancies
        const discrepancy = Math.abs(storedMinutes - calculatedMinutes);
        const isValid = discrepancy <= 1; // Allow 1 minute tolerance for rounding

        if (!isValid) {
            issues.push(`Minutes mismatch: stored ${storedMinutes}, calculated ${calculatedMinutes}`);
        }

        return {
            isValid,
            correctedMinutes: calculatedMinutes,
            storedMinutes,
            validSessions,
            totalSessions: sessions.length,
            issues
        };
    }

    /**
     * Ensure data completeness
     */
    checkDataCompleteness(dataset) {
        if (!dataset || typeof dataset !== 'object') {
            return { isComplete: false, missingFields: ['entire dataset'] };
        }

        const requiredFields = ['minutes', 'scoreSum', 'samples', 'sessions', 'notes'];
        const missingFields = [];

        requiredFields.forEach(field => {
            if (!(field in dataset)) {
                missingFields.push(field);
            }
        });

        // Check session completeness
        const sessions = dataset.sessions || [];
        const incompleteSessions = sessions.filter(session => 
            !session.id || !session.startTime || typeof session.minutes !== 'number'
        );

        if (incompleteSessions.length > 0) {
            missingFields.push(`${incompleteSessions.length} incomplete sessions`);
        }

        return {
            isComplete: missingFields.length === 0,
            missingFields,
            sessionCount: sessions.length,
            incompleteSessionCount: incompleteSessions.length
        };
    }

    /**
     * Fix incomplete data display
     */
    repairIncompleteData(data) {
        if (!data || typeof data !== 'object') {
            return this.createEmptyRecord();
        }

        const repaired = this.validateAnalyticsData(data);
        
        // Additional repairs for common issues
        
        // Fix sessions without proper time formatting
        repaired.sessions = repaired.sessions.map(session => {
            if (session.startTime && !session.endTime && session.minutes > 0) {
                // Calculate end time if missing
                const start = new Date(session.startTime);
                const end = new Date(start.getTime() + (session.minutes * 60000));
                session.endTime = end.toISOString();
            }
            return session;
        });

        // Recalculate score averages if needed
        if (repaired.samples > 0 && repaired.scoreSum > 0) {
            const calculatedAverage = Math.round(repaired.scoreSum / repaired.samples);
            repaired.averageScore = calculatedAverage;
        } else {
            repaired.averageScore = 0;
        }

        return repaired;
    }

    /**
     * Create empty record with proper structure
     */
    createEmptyRecord() {
        return {
            minutes: 0,
            scoreSum: 0,
            samples: 0,
            sessions: [],
            notes: '',
            averageScore: 0
        };
    }

    /**
     * Create empty session with proper structure
     */
    createEmptySession() {
        return {
            id: Date.now().toString(),
            startTime: null,
            endTime: null,
            minutes: 0,
            avgScore: 0,
            mood: '',
            moodTimestamp: null
        };
    }

    /**
     * Validate entire statistics dataset
     */
    validateStatisticsDataset(allStats) {
        if (!allStats || typeof allStats !== 'object') {
            console.warn('Invalid statistics dataset');
            return {};
        }

        const validatedStats = {};
        const validationReport = {
            totalDays: 0,
            validDays: 0,
            repairedDays: 0,
            issues: []
        };

        Object.entries(allStats).forEach(([dateKey, record]) => {
            validationReport.totalDays++;
            
            try {
                // Validate date key format
                const date = new Date(dateKey);
                if (isNaN(date.getTime())) {
                    validationReport.issues.push(`Invalid date key: ${dateKey}`);
                    return;
                }

                // Validate and repair record
                const originalRecord = { ...record };
                const validatedRecord = this.repairIncompleteData(record);
                
                validatedStats[dateKey] = validatedRecord;
                validationReport.validDays++;

                // Check if repairs were made
                if (JSON.stringify(originalRecord) !== JSON.stringify(validatedRecord)) {
                    validationReport.repairedDays++;
                    console.log(`Repaired data for ${dateKey}`);
                }

            } catch (error) {
                validationReport.issues.push(`Error processing ${dateKey}: ${error.message}`);
                console.error(`Error validating data for ${dateKey}:`, error);
            }
        });

        console.log('Data validation report:', validationReport);
        return validatedStats;
    }

    /**
     * Format duration properly (handles edge cases)
     */
    formatDuration(minutes) {
        if (typeof minutes !== 'number' || minutes < 0) {
            return '0m';
        }

        if (minutes < 60) {
            return `${Math.round(minutes)}m`;
        }

        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        
        if (mins === 0) {
            return `${hours}h`;
        }
        
        return `${hours}h ${mins}m`;
    }

    /**
     * Format time string with error handling
     */
    formatTime(timeString) {
        if (!timeString) return '--';
        
        try {
            const date = new Date(timeString);
            if (isNaN(date.getTime())) {
                return '--';
            }

            return date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.warn('Error formatting time:', timeString, error);
            return '--';
        }
    }
}