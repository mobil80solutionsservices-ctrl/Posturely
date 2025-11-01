document.addEventListener('DOMContentLoaded', async function() {
    // Import modules with error handling
    let DataPersistenceManager, LocalizationService, DataIntegrityValidator, UIComponentManager, ThemeSynchronizationService, AIInsightsManager;

    try {
        const modules = await Promise.all([
            import('./src/DataPersistenceManager.js'),
            import('./src/LocalizationService.js'),
            import('./src/DataIntegrityValidator.js'),
            import('./src/UIComponentManager.js'),
            import('./src/ThemeSynchronizationService.js'),
            import('./src/AIInsightsManager.js')
        ]);
        
        DataPersistenceManager = modules[0].DataPersistenceManager;
        LocalizationService = modules[1].LocalizationService;
        DataIntegrityValidator = modules[2].DataIntegrityValidator;
        UIComponentManager = modules[3].UIComponentManager;
        ThemeSynchronizationService = modules[4].ThemeSynchronizationService;
        AIInsightsManager = modules[5].AIInsightsManager;
        
        console.log('All modules loaded successfully');
    } catch (error) {
        console.error('Error loading modules:', error);
        // Create fallback classes to prevent script failure
        DataPersistenceManager = class { validateAndMigrateData() { return Promise.resolve(); } };
        LocalizationService = class { 
            initialize() { return Promise.resolve(); }
            translateAnalyticsDashboard() { return Promise.resolve(); }
            getAnalyticsTranslation(key) { return Promise.resolve(key); }
        };
        DataIntegrityValidator = class { 
            validateStatisticsDataset(data) { return data; }
            validateAnalyticsData(data) { return data; }
            validateDailyMinutes(data) { return { isValid: true, correctedMinutes: data.minutes || 0 }; }
            formatDuration(minutes) { 
                if (minutes < 60) return `${minutes}m`;
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
            }
            formatTime(timeString) {
                if (!timeString) return '--';
                const [hours, minutes] = timeString.split(':');
                const hour = parseInt(hours);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                return `${displayHour}:${minutes} ${ampm}`;
            }
        };
        UIComponentManager = class { 
            initialize() { return { success: true }; }
            ensureStatisticsGrid() { return true; }
            validateButtonFunctionality() { return true; }
        };
        ThemeSynchronizationService = class { 
            syncThemeOnLoad() { return Promise.resolve(); }
            setupAnalyticsSync() { return true; }
        };
        AIInsightsManager = class {
            async initialize() { return false; }
            async generateInsights(date, dayRecord) { 
                return [
                    { icon: '💡', text: 'AI insights not available - using fallback insights' },
                    { icon: '📊', text: 'Track consistently to unlock personalized insights' }
                ];
            }
            isAIAvailable() { return false; }
        };
    }
    // DOM Elements

    const calendarTitle = document.getElementById('calendarTitle');
    const calendarGrid = document.getElementById('calendarGrid');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const todayBtn = document.getElementById('todayBtn');
    const statsGrid = document.getElementById('statsGrid');
    const dayDetails = document.getElementById('dayDetails');
    const sessionHistory = document.getElementById('sessionHistory');
    const aiInsights = document.getElementById('aiInsights');

    // State
    let calendarCursor = new Date();
    let selectedDate = null;
    let allStats = {};

    // Initialize managers and services
    const dataManager = new DataPersistenceManager();
    const localizationService = new LocalizationService();
    const dataValidator = new DataIntegrityValidator();
    const uiManager = new UIComponentManager();
    const themeService = new ThemeSynchronizationService();
    const aiInsightsManager = new AIInsightsManager();

    // Set up event listeners immediately after DOM elements are found
    console.log('Setting up event listeners...');
    console.log('Elements found:', {
        prevMonthBtn: !!prevMonthBtn,
        nextMonthBtn: !!nextMonthBtn,
        todayBtn: !!todayBtn
    });

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', async () => {
            console.log('Previous month clicked');
            calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
            renderCalendar();
            // Update statistics for the new month
            await renderStatistics(calendarCursor);
        });
        console.log('Previous month event listener added');
    } else {
        console.error('prevMonthBtn element not found!');
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', async () => {
            console.log('Next month clicked');
            calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
            renderCalendar();
            // Update statistics for the new month
            await renderStatistics(calendarCursor);
        });
        console.log('Next month event listener added');
    } else {
        console.error('nextMonthBtn element not found!');
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            console.log('Today button clicked');
            calendarCursor = new Date();
            renderCalendar();
            selectDate(new Date());
        });
        console.log('Today button event listener added');
    } else {
        console.error('todayBtn element not found!');
    }

    // Initialize localization service
    localizationService.initialize().then(() => {
        // Translate analytics dashboard when language is available
        localizationService.translateAnalyticsDashboard();
    });

    // Utility Functions
    function ymd(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function mondayStartOfWeek(date) {
        const d = new Date(date);
        const day = (d.getDay() + 6) % 7; // 0=Mon ... 6=Sun
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function formatDuration(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    function formatTime(timeString) {
        if (!timeString) return '--';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    function getScoreClass(score) {
        if (score >= 80) return 'score-good';
        if (score >= 60) return 'score-fair';
        return 'score-poor';
    }

    function getScoreLabel(score) {
        if (score >= 80) return 'Good';
        if (score >= 60) return 'Fair';
        return 'Poor';
    }

    // Theme Management - now handled by ThemeSynchronizationService
    // The service automatically syncs theme changes from main extension

    // Data Loading with comprehensive validation and error handling
    function loadAllStats() {
        return new Promise((resolve, reject) => {
            try {
                // Ensure statistics grid exists
                uiManager.ensureStatisticsGrid();
                
                // Show loading state for statistics
                showLoadingState('statsGrid');
                
                chrome.storage.local.get(['statsByDate'], (result) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error loading stats:', chrome.runtime.lastError);
                        showErrorState('statsGrid', 'Failed to load statistics data');
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    
                    const rawStats = result.statsByDate || {};
                    console.log('Loaded raw stats for', Object.keys(rawStats).length, 'days');
                    
                    // Validate and repair data integrity
                    allStats = dataValidator.validateStatisticsDataset(rawStats);
                    console.log('Validated stats for', Object.keys(allStats).length, 'days');
                    
                    // Migrate data if needed
                    dataManager.validateAndMigrateData().then(() => {
                        resolve(allStats);
                    }).catch(migrateError => {
                        console.warn('Data migration failed, continuing with validated data:', migrateError);
                        resolve(allStats);
                    });
                });
            } catch (error) {
                console.error('Error in loadAllStats:', error);
                showErrorState('statsGrid', 'Failed to load statistics data');
                reject(error);
            }
        });
    }

    // Show loading state for a section
    function showLoadingState(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('loading');
            element.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⏳</div>
                    <div class="empty-state-text">Loading...</div>
                    <div class="empty-state-subtext">Please wait while we load your data</div>
                </div>
            `;
        }
    }

    // Show error state for a section
    function showErrorState(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('loading');
            element.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <div class="empty-state-text">Error</div>
                    <div class="empty-state-subtext">${message}</div>
                </div>
            `;
        }
    }

    // Clear loading state for a section
    function clearLoadingState(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('loading');
        }
    }

    // Calendar Rendering with error handling
    function renderCalendar() {
        try {
            const year = calendarCursor.getFullYear();
            const month = calendarCursor.getMonth();

            // Set calendar title
            if (calendarTitle) {
                calendarTitle.textContent = calendarCursor.toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric'
                });
            }

            // Calculate calendar grid start date (Monday of the week containing the 1st)
            const firstOfMonth = new Date(year, month, 1);
            const startDate = mondayStartOfWeek(firstOfMonth);

            // Clear existing calendar grid
            if (calendarGrid) {
                calendarGrid.innerHTML = '';

                // Generate 42 days (6 weeks) for complete calendar grid
                for (let i = 0; i < 42; i++) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + i);

                    const dateKey = ymd(currentDate);
                    const dayRecord = allStats[dateKey];
                    const minutesTracked = dayRecord ? (dayRecord.minutes || 0) : 0;

                    // Create calendar day cell
                    const dayCell = document.createElement('div');
                    dayCell.className = 'cal-day';
                    dayCell.textContent = currentDate.getDate();

                    // Style days from other months
                    if (currentDate.getMonth() !== month) {
                        dayCell.classList.add('other-month');
                    }

                    // Add visual indicators for days with tracking activity
                    if (dayRecord && minutesTracked > 0) {
                        if (minutesTracked >= 60) {
                            dayCell.classList.add('high-activity');
                        } else {
                            dayCell.classList.add('has-data');
                        }

                        // Add activity indicator dot
                        const indicator = document.createElement('div');
                        indicator.className = 'activity-indicator';
                        dayCell.appendChild(indicator);

                        // Add tooltip with tracking info
                        dayCell.title = `${minutesTracked} minutes tracked`;
                    }

                    // Highlight today
                    const today = new Date();
                    if (currentDate.toDateString() === today.toDateString()) {
                        dayCell.classList.add('today');
                    }

                    // Highlight selected date
                    if (selectedDate && currentDate.toDateString() === selectedDate.toDateString()) {
                        dayCell.classList.add('selected');
                    }

                    // Add click handler for day selection
                    dayCell.addEventListener('click', () => selectDate(currentDate));

                    calendarGrid.appendChild(dayCell);
                }
            }
        } catch (error) {
            console.error('Error rendering calendar:', error);
            if (calendarGrid) {
                calendarGrid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <div class="empty-state-icon">⚠️</div>
                        <div class="empty-state-text">Calendar Error</div>
                        <div class="empty-state-subtext">Failed to render calendar view</div>
                    </div>
                `;
            }
        }
    }

    // Date Selection with data validation
    async function selectDate(date) {
        selectedDate = new Date(date);
        const dateKey = ymd(date);

        // Update calendar highlighting
        renderCalendar();

        // Get and validate day record
        const rawDayRecord = allStats[dateKey] || {
            minutes: 0,
            scoreSum: 0,
            samples: 0,
            notes: '',
            sessions: []
        };

        // Validate and repair day record data
        const dayRecord = dataValidator.validateAnalyticsData(rawDayRecord);
        
        // Check for data integrity issues
        const validation = dataValidator.validateDailyMinutes(dayRecord);
        if (!validation.isValid) {
            console.warn(`Data integrity issues for ${dateKey}:`, validation.issues);
            // Use corrected minutes if there's a discrepancy
            dayRecord.minutes = validation.correctedMinutes;
        }

        // Render day details with validated data
        await renderDayDetails(date, dayRecord);

        // Render session history with validated data
        await renderSessionHistory(dayRecord);

        // Update insights based on selected day
        await updateInsights(date, dayRecord);

        // Update statistics for the selected month
        await renderStatistics(date);
    }

    // Day Details Rendering with error handling
    async function renderDayDetails(date, dayRecord) {
        try {
            if (!dayDetails) {
                console.error('Day details element not found');
                return;
            }

            if (!date || isNaN(date.getTime())) {
                throw new Error('Invalid date provided');
            }

            // Use validated data with proper formatting
            const totalMinutes = dayRecord.minutes || 0;
            const averageScore = dayRecord.averageScore || 
                (dayRecord.samples > 0 ? Math.round(dayRecord.scoreSum / dayRecord.samples) : 0);
            const sessionCount = dayRecord.sessions ? dayRecord.sessions.length : 0;

            const formattedDate = date.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Get translated labels
            const dateLabel = await localizationService.getAnalyticsTranslation('date-label');
            const totalTimeLabel = await localizationService.getAnalyticsTranslation('total-time-label');
            const averageScoreLabel = await localizationService.getAnalyticsTranslation('average-score-label');
            const sessionsLabel = await localizationService.getAnalyticsTranslation('sessions-label');
            const notesLabel = await localizationService.getAnalyticsTranslation('notes-label');
            const saveNotesText = await localizationService.getAnalyticsTranslation('save-notes');
            const notesPlaceholder = await localizationService.getAnalyticsTranslation('add-notes-placeholder');
            const noDataText = await localizationService.getAnalyticsTranslation('no-data');
            const goodScoreText = await localizationService.getAnalyticsTranslation('good-score');
            const fairScoreText = await localizationService.getAnalyticsTranslation('fair-score');
            const poorScoreText = await localizationService.getAnalyticsTranslation('poor-score');

            // Get translated score label
            let scoreLabel = '--';
            if (averageScore >= 80) scoreLabel = goodScoreText;
            else if (averageScore >= 60) scoreLabel = fairScoreText;
            else if (averageScore > 0) scoreLabel = poorScoreText;

            dayDetails.innerHTML = `
                <div class="detail-row">
                    <div class="detail-label">${dateLabel}</div>
                    <div class="detail-value">${formattedDate}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">${totalTimeLabel}</div>
                    <div class="detail-value">${totalMinutes > 0 ? dataValidator.formatDuration(totalMinutes) : noDataText}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">${averageScoreLabel}</div>
                    <div class="detail-value ${getScoreClass(averageScore)}">
                        ${averageScore > 0 ? `${averageScore} (${scoreLabel})` : '--'}
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">${sessionsLabel}</div>
                    <div class="detail-value">${sessionCount}</div>
                </div>
                <div class="notes-section">
                    <div class="detail-label" style="margin-bottom: 8px;">${notesLabel}</div>
                    <textarea 
                        id="dayNotes" 
                        class="notes-input" 
                        placeholder="${notesPlaceholder}"
                    >${dayRecord.notes || ''}</textarea>
                    <button id="saveNotes" class="save-notes-button">${saveNotesText}</button>
                </div>
            `;

            // Add save notes functionality with error handling
            const saveNotesBtn = document.getElementById('saveNotes');
            const notesInput = document.getElementById('dayNotes');

            if (saveNotesBtn && notesInput) {
                saveNotesBtn.addEventListener('click', () => {
                    try {
                        const dateKey = ymd(date);
                        const updatedRecord = { ...dayRecord, notes: notesInput.value.trim() };
                        allStats[dateKey] = updatedRecord;

                        chrome.storage.local.set({ statsByDate: allStats }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('Error saving notes:', chrome.runtime.lastError);
                                saveNotesBtn.textContent = 'Error!';
                                setTimeout(() => {
                                    saveNotesBtn.textContent = 'Save Notes';
                                }, 2000);
                                return;
                            }

                            console.log(`Notes saved for ${dateKey}`);
                            // Show brief feedback
                            saveNotesBtn.textContent = 'Saved!';
                            setTimeout(() => {
                                saveNotesBtn.textContent = 'Save Notes';
                            }, 1500);
                        });
                    } catch (error) {
                        console.error('Error saving notes:', error);
                        saveNotesBtn.textContent = 'Error!';
                        setTimeout(() => {
                            saveNotesBtn.textContent = 'Save Notes';
                        }, 2000);
                    }
                });
            }

        } catch (error) {
            console.error('Error rendering day details:', error);
            if (dayDetails) {
                const errorText = await localizationService.getAnalyticsTranslation('error');
                const failedDayDetailsText = await localizationService.getAnalyticsTranslation('failed-day-details');
                
                dayDetails.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <div class="empty-state-text">${errorText}</div>
                        <div class="empty-state-subtext">${failedDayDetailsText}</div>
                    </div>
                `;
            }
        }
    }

    // Session History Rendering with error handling
    async function renderSessionHistory(dayRecord) {
        try {
            if (!sessionHistory) {
                console.error('Session history element not found');
                return;
            }

            const sessions = dayRecord.sessions || [];

            if (sessions.length === 0) {
                const noSessionsText = await localizationService.getAnalyticsTranslation('no-sessions');
                const noTrackingSessionsText = await localizationService.getAnalyticsTranslation('no-tracking-sessions');
                
                sessionHistory.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⏱️</div>
                        <div class="empty-state-text">${noSessionsText}</div>
                        <div class="empty-state-subtext">${noTrackingSessionsText}</div>
                    </div>
                `;
                return;
            }

            const sessionPromises = sessions.map(async (session, index) => {
                try {
                    // Use validator for consistent formatting
                    const startTime = dataValidator.formatTime(session.startTime);
                    const endTime = dataValidator.formatTime(session.endTime);
                    const duration = dataValidator.formatDuration(session.minutes || 0);
                    const score = session.avgScore || 0;
                    const scoreClass = getScoreClass(score);

                    return `
                        <div class="session-item">
                            <div class="session-info">
                                <div class="session-time">${startTime} - ${endTime}</div>
                                <div class="session-duration">${duration}</div>
                                ${session.mood ? `<div class="session-mood">💭 ${session.mood}</div>` : ''}
                            </div>
                            <div class="session-score ${scoreClass}">
                                ${score > 0 ? score : '--'}
                            </div>
                        </div>
                    `;
                } catch (sessionError) {
                    console.warn('Error rendering session', index, ':', sessionError);
                    const sessionText = await localizationService.getAnalyticsTranslation('session');
                    const errorLoadingText = await localizationService.getAnalyticsTranslation('error-loading-session');
                    
                    return `
                        <div class="session-item">
                            <div class="session-info">
                                <div class="session-time">${sessionText} ${index + 1}</div>
                                <div class="session-duration">${errorLoadingText}</div>
                            </div>
                            <div class="session-score">--</div>
                        </div>
                    `;
                }
            });
            
            const sessionList = (await Promise.all(sessionPromises)).join('');

            sessionHistory.innerHTML = `
                <div class="session-list">
                    ${sessionList}
                </div>
            `;

        } catch (error) {
            console.error('Error rendering session history:', error);
            if (sessionHistory) {
                const errorText = await localizationService.getAnalyticsTranslation('error');
                const failedSessionHistoryText = await localizationService.getAnalyticsTranslation('failed-session-history');
                
                sessionHistory.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <div class="empty-state-text">${errorText}</div>
                        <div class="empty-state-subtext">${failedSessionHistoryText}</div>
                    </div>
                `;
            }
        }
    }

    // Full Body Scan History
    function renderScanHistory() {
        try {
            const scanHistoryGrid = document.getElementById('scanHistoryGrid');
            if (!scanHistoryGrid) {
                console.error('Scan history grid element not found');
                return;
            }

            // Get scan history from storage
            chrome.storage.local.get(['scanHistory'], (result) => {
                const scanHistory = result.scanHistory || [];
                
                if (scanHistory.length === 0) {
                    scanHistoryGrid.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📷</div>
                            <div class="empty-state-text">No scans yet</div>
                            <div class="empty-state-subtext">Complete a full body scan to see your posture analysis history</div>
                        </div>
                    `;
                    return;
                }

                // Show only last 10 scans for better history view
                const recentScans = scanHistory.slice(-10).reverse();
                
                scanHistoryGrid.innerHTML = recentScans.map((scan, index) => {
                    const date = new Date(scan.timestamp);
                    const scoreClass = getScoreClass(scan.overallScore || 0);
                    
                    return `
                        <div class="scan-history-item" data-scan-index="${scanHistory.length - 1 - index}">
                            <div class="scan-thumbnail">📷</div>
                            <div class="scan-info">
                                <div class="scan-date">${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                <div class="scan-details">
                                    ${scan.views ? `${scan.views.length} views captured` : 'Multi-view scan'} • 
                                    ${scan.recommendations ? `${scan.recommendations.length} recommendations` : 'Analysis complete'}
                                    ${scan.metrics ? ` • Neck: ${Math.abs(scan.metrics.neckTilt || 0).toFixed(1)}° • Shoulders: ${Math.abs(scan.metrics.shoulderTilt || 0).toFixed(1)}°` : ''}
                                </div>
                            </div>
                            <div class="scan-score">
                                <div class="scan-score-value ${scoreClass}">${Math.round(scan.overallScore || 0)}</div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                // Add click handlers for scan details
                scanHistoryGrid.querySelectorAll('.scan-history-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const scanIndex = parseInt(item.dataset.scanIndex);
                        showScanDetails(scanHistory[scanIndex]);
                    });
                    item.style.cursor = 'pointer';
                });
            });
        } catch (error) {
            console.error('Error rendering scan history:', error);
            const scanHistoryGrid = document.getElementById('scanHistoryGrid');
            if (scanHistoryGrid) {
                scanHistoryGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <div class="empty-state-text">Error loading scan history</div>
                        <div class="empty-state-subtext">Please try refreshing the page</div>
                    </div>
                `;
            }
        }
    }
    
    // Show detailed scan information
    async function showScanDetails(scan) {
        if (!scan) return;
        
        const date = new Date(scan.timestamp);
        const scoreClass = getScoreClass(scan.overallScore || 0);
        
        // Get translated labels
        const scanDetailsLabel = await localizationService.getAnalyticsTranslation('scan-details');
        const overallScoreLabel = await localizationService.getAnalyticsTranslation('avg-score');
        const viewsCapturedLabel = await localizationService.getAnalyticsTranslation('views-captured-count');
        const measurementsLabel = await localizationService.getAnalyticsTranslation('measurements');
        const neckTiltLabel = await localizationService.getAnalyticsTranslation('neck-tilt-measurement');
        const shoulderTiltLabel = await localizationService.getAnalyticsTranslation('shoulder-tilt-measurement');
        const hipTiltLabel = await localizationService.getAnalyticsTranslation('hip-tilt-measurement');
        const overallAlignmentLabel = await localizationService.getAnalyticsTranslation('overall-alignment-measurement');
        const recommendationsLabel = await localizationService.getAnalyticsTranslation('recommendations');
        
        const detailsHtml = `
            <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 8px 0; color: var(--text);">📷 ${scanDetailsLabel}</h4>
                <p style="margin: 0; color: var(--subtext); font-size: 14px;">
                    ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}
                </p>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                    <div style="text-align: center; padding: 12px; background: var(--score-surface); border-radius: 8px;">
                        <div style="font-size: 12px; color: var(--subtext); margin-bottom: 4px;">${overallScoreLabel}</div>
                        <div class="${scoreClass}" style="font-size: 24px; font-weight: 700;">${Math.round(scan.overallScore || 0)}</div>
                    </div>
                    <div style="text-align: center; padding: 12px; background: var(--score-surface); border-radius: 8px;">
                        <div style="font-size: 12px; color: var(--subtext); margin-bottom: 4px;">${viewsCapturedLabel}</div>
                        <div style="font-size: 24px; font-weight: 700; color: var(--text);">${scan.views ? scan.views.length : 2}</div>
                    </div>
                </div>
            </div>
            
            ${scan.metrics ? `
                <div style="margin-bottom: 16px;">
                    <h5 style="margin: 0 0 8px 0; color: var(--text);">📊 ${measurementsLabel}</h5>
                    <div style="font-size: 14px; color: var(--text); line-height: 1.5;">
                        • ${neckTiltLabel}: ${Math.abs(scan.metrics.neckTilt || 0).toFixed(1)}°<br>
                        • ${shoulderTiltLabel}: ${Math.abs(scan.metrics.shoulderTilt || 0).toFixed(1)}°<br>
                        • ${hipTiltLabel}: ${Math.abs(scan.metrics.hipTilt || 0).toFixed(1)}°<br>
                        • ${overallAlignmentLabel}: ${scan.metrics.overallAlignment || 0}%
                    </div>
                </div>
            ` : ''}
            
            ${scan.recommendations && scan.recommendations.length > 0 ? `
                <div style="margin-bottom: 16px;">
                    <h5 style="margin: 0 0 8px 0; color: var(--text);">💡 ${recommendationsLabel}</h5>
                    <ul style="margin: 0; padding-left: 16px; font-size: 14px; color: var(--text); line-height: 1.5;">
                        ${scan.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
        
        // Update day details with scan information
        const dayDetails = document.getElementById('dayDetails');
        if (dayDetails) {
            dayDetails.innerHTML = detailsHtml;
        }
    }

    // Statistics Overview with error handling and loading states (kept for compatibility)
    async function renderStatistics(selectedDate = null) {
        try {
            if (!statsGrid) {
                console.error('Statistics grid element not found');
                return;
            }

            clearLoadingState('statsGrid');

            const now = new Date();
            let filterDate = selectedDate || now;
            
            // If a date is selected, calculate stats for that month
            let startDate, endDate, periodLabel;
            if (selectedDate) {
                // Calculate stats for the selected month
                startDate = new Date(filterDate.getFullYear(), filterDate.getMonth(), 1);
                endDate = new Date(filterDate.getFullYear(), filterDate.getMonth() + 1, 0);
                periodLabel = filterDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            } else {
                // Calculate overall stats (no date filter)
                startDate = null;
                endDate = null;
                periodLabel = 'All Time';
            }

            const thisWeekStart = mondayStartOfWeek(now);
            const lastWeekStart = new Date(thisWeekStart);
            lastWeekStart.setDate(thisWeekStart.getDate() - 7);

            // Calculate statistics
            let totalMinutes = 0;
            let totalSessions = 0;
            let totalDays = 0;
            let thisWeekMinutes = 0;
            let lastWeekMinutes = 0;
            let bestDay = { date: null, minutes: 0 };
            let scoreSum = 0;
            let scoreSamples = 0;

            // Validate allStats exists
            if (!allStats || typeof allStats !== 'object') {
                throw new Error('Statistics data is not available');
            }

            Object.entries(allStats).forEach(([dateKey, record]) => {
                try {
                    const date = new Date(dateKey);
                    if (isNaN(date.getTime())) {
                        console.warn('Invalid date key:', dateKey);
                        return;
                    }

                    // Apply date filter if selected
                    if (startDate && endDate) {
                        if (date < startDate || date > endDate) {
                            return; // Skip dates outside the selected month
                        }
                    }

                    const minutes = record.minutes || 0;
                    const sessions = record.sessions || [];

                    if (minutes > 0) {
                        totalMinutes += minutes;
                        totalSessions += sessions.length;
                        totalDays++;

                        // Best day tracking
                        if (minutes > bestDay.minutes) {
                            bestDay = { date: dateKey, minutes };
                        }

                        // Week comparisons (only for current stats, not filtered)
                        if (!selectedDate) {
                            if (date >= thisWeekStart) {
                                thisWeekMinutes += minutes;
                            } else if (date >= lastWeekStart && date < thisWeekStart) {
                                lastWeekMinutes += minutes;
                            }
                        }

                        // Average score calculation
                        if (record.samples > 0) {
                            scoreSum += record.scoreSum;
                            scoreSamples += record.samples;
                        }
                    }
                } catch (recordError) {
                    console.warn('Error processing record for date', dateKey, ':', recordError);
                }
            });

            const averageScore = scoreSamples > 0 ? Math.round(scoreSum / scoreSamples) : 0;
            const averageMinutesPerDay = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
            const weekTrend = thisWeekMinutes - lastWeekMinutes;
            const weekTrendPercent = lastWeekMinutes > 0 ? Math.round((weekTrend / lastWeekMinutes) * 100) : 0;

            // Get translated labels
            const totalTimeLabel = await localizationService.getAnalyticsTranslation('total-time');
            const totalSessionsLabel = await localizationService.getAnalyticsTranslation('total-sessions');
            const activeDaysLabel = await localizationService.getAnalyticsTranslation('active-days');
            const avgScoreLabel = await localizationService.getAnalyticsTranslation('avg-score');
            const avgPerDayLabel = await localizationService.getAnalyticsTranslation('avg-per-day');
            const thisWeekLabel = selectedDate ? periodLabel : await localizationService.getAnalyticsTranslation('this-week');

            // Render statistics cards with translated labels
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${dataValidator.formatDuration(totalMinutes)}</div>
                    <div class="stat-label">${totalTimeLabel}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalSessions}</div>
                    <div class="stat-label">${totalSessionsLabel}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalDays}</div>
                    <div class="stat-label">${activeDaysLabel}</div>
                </div>
                <div class="stat-card avg-score-card">
                    <div class="stat-value ${getScoreClass(averageScore)}">${averageScore > 0 ? averageScore : '--'}</div>
                    <div class="stat-label">${avgScoreLabel}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${dataValidator.formatDuration(averageMinutesPerDay)}</div>
                    <div class="stat-label">${avgPerDayLabel}</div>
                </div>
                ${selectedDate ? `
                    <div class="stat-card">
                        <div class="stat-value">${periodLabel}</div>
                        <div class="stat-label">Period</div>
                    </div>
                ` : `
                    <div class="stat-card">
                        <div class="stat-value">${dataValidator.formatDuration(thisWeekMinutes)}</div>
                        <div class="stat-label">${thisWeekLabel}</div>
                        ${weekTrend !== 0 ? `
                            <div class="stat-trend ${weekTrend > 0 ? 'trend-up' : 'trend-down'}">
                                ${weekTrend > 0 ? '↗' : '↘'} ${Math.abs(weekTrendPercent)}%
                            </div>
                        ` : ''}
                    </div>
                `}
            `;

            console.log('Statistics rendered successfully:', {
                totalMinutes,
                totalSessions,
                totalDays,
                averageScore
            });

        } catch (error) {
            console.error('Error rendering statistics:', error);
            const failedMessage = await localizationService.getAnalyticsTranslation('failed-statistics');
            showErrorState('statsGrid', failedMessage);
        }
    }

    // AI Insights Update with Chrome AI Summarizer API
    async function updateInsights(date, dayRecord) {
        try {
            if (!aiInsights) {
                console.error('AI insights element not found');
                return;
            }

            // Show loading state
            aiInsights.innerHTML = `
                <div class="insight-item">
                    <span class="insight-icon">⏳</span>
                    Generating personalized insights...
                </div>
            `;

            // Calculate weekly and monthly stats for context
            const weeklyStats = calculateWeeklyStats(date);
            const monthlyStats = calculateMonthlyStats(date);

            // Generate insights using AI or fallback
            const insights = await aiInsightsManager.generateInsights(date, dayRecord, weeklyStats, monthlyStats);
            
            if (!insights || insights.length === 0) {
                aiInsights.innerHTML = `
                    <div class="insight-item">
                        <span class="insight-icon">💡</span>
                        No insights available for this day
                    </div>
                `;
                return;
            }

            // Render insights with AI indicator if available
            const aiStatus = aiInsightsManager.isAIAvailable() ? ' (AI-powered)' : '';
            aiInsights.innerHTML = insights.map(insight => `
                <div class="insight-item">
                    <span class="insight-icon">${insight.icon || '💡'}</span>
                    ${insight.text || 'No insight text available'}
                </div>
            `).join('');

            console.log(`Generated ${insights.length} insights${aiStatus}`);

        } catch (error) {
            console.error('Error updating insights:', error);
            if (aiInsights) {
                aiInsights.innerHTML = `
                    <div class="insight-item">
                        <span class="insight-icon">⚠️</span>
                        Error loading insights
                    </div>
                `;
            }
        }
    }

    // Calculate weekly statistics for AI context
    function calculateWeeklyStats(selectedDate) {
        const weekStart = mondayStartOfWeek(selectedDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        let totalMinutes = 0;
        let totalSamples = 0;
        let scoreSum = 0;
        let activeDays = 0;

        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
            const dateKey = ymd(d);
            const dayRecord = allStats[dateKey];
            
            if (dayRecord && dayRecord.minutes > 0) {
                totalMinutes += dayRecord.minutes;
                activeDays++;
                
                if (dayRecord.samples > 0) {
                    scoreSum += dayRecord.scoreSum;
                    totalSamples += dayRecord.samples;
                }
            }
        }

        return {
            totalMinutes,
            averageScore: totalSamples > 0 ? Math.round(scoreSum / totalSamples) : 0,
            activeDays
        };
    }

    // Calculate monthly statistics for AI context
    function calculateMonthlyStats(selectedDate) {
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

        let totalMinutes = 0;
        let totalSamples = 0;
        let scoreSum = 0;
        let activeDays = 0;

        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
            const dateKey = ymd(d);
            const dayRecord = allStats[dateKey];
            
            if (dayRecord && dayRecord.minutes > 0) {
                totalMinutes += dayRecord.minutes;
                activeDays++;
                
                if (dayRecord.samples > 0) {
                    scoreSum += dayRecord.scoreSum;
                    totalSamples += dayRecord.samples;
                }
            }
        }

        return {
            totalMinutes,
            averageScore: totalSamples > 0 ? Math.round(scoreSum / totalSamples) : 0,
            activeDays
        };
    }







    // Initialize with comprehensive error handling and data validation
    async function initialize() {
        try {
            console.log('Initializing analytics dashboard with data integrity validation...');

            // Initialize UI Component Manager first
            try {
                const uiValidation = uiManager.initialize();
                console.log('UI Component Manager initialized:', uiValidation);
            } catch (uiError) {
                console.error('Error initializing UI Component Manager:', uiError);
                // Continue initialization even if UI setup has issues
            }

            // Setup theme synchronization for analytics dashboard
            try {
                await themeService.syncThemeOnLoad();
                themeService.setupAnalyticsSync();
                console.log('Theme synchronization setup complete');
            } catch (themeError) {
                console.error('Error setting up theme synchronization:', themeError);
                // Continue initialization even if theme setup fails
            }

            // Initialize localization service for analytics
            try {
                await localizationService.initialize();
                await localizationService.translateAnalyticsDashboard();
                console.log('Localization service initialized for analytics');
            } catch (localizationError) {
                console.error('Error setting up localization:', localizationError);
                // Continue initialization even if localization setup fails
            }

            // Initialize AI Insights Manager
            try {
                const aiInitialized = await aiInsightsManager.initialize();
                if (aiInitialized) {
                    console.log('AI Insights Manager initialized successfully - AI-powered insights enabled');
                } else {
                    console.log('AI Insights Manager using fallback mode - static insights only');
                }
            } catch (aiError) {
                console.error('Error initializing AI Insights Manager:', aiError);
                // Continue initialization even if AI setup fails
            }

            // Load and validate all statistics data
            try {
                await loadAllStats();
                console.log('Statistics data loaded and validated successfully');
                
                // Render statistics overview
                await renderStatistics();
                console.log('Statistics overview rendered successfully');
            } catch (statsError) {
                console.error('Error loading statistics data:', statsError);
                // Show error state but continue with empty data
                allStats = {};
                showErrorState('statsGrid', 'Failed to load statistics data');
            }

            // Render initial views with error handling
            try {
                renderCalendar();
                console.log('Calendar rendered successfully');
            } catch (calendarError) {
                console.error('Error rendering calendar:', calendarError);
            }

            try {
                renderScanHistory();
                console.log('Scan history rendered successfully');
            } catch (scanRenderError) {
                console.error('Error rendering scan history:', scanRenderError);
            }

            // Select today by default
            try {
                await selectDate(new Date());
                console.log('Today selected by default');
            } catch (selectError) {
                console.error('Error selecting today:', selectError);
            }

            // Final UI validation
            try {
                uiManager.validateButtonFunctionality();
                console.log('Button functionality validated');
            } catch (buttonError) {
                console.error('Error validating buttons:', buttonError);
            }
            
            // Set up storage change listener for scan history updates
            try {
                chrome.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace === 'local' && changes.scanHistory) {
                        console.log('Scan history updated, refreshing display');
                        renderScanHistory();
                    }
                });
                console.log('Storage change listener set up for scan history');
            } catch (storageError) {
                console.error('Error setting up storage listener:', storageError);
            }

            console.log('Analytics page initialization complete with data integrity validation');

        } catch (error) {
            console.error('Critical error during analytics initialization:', error);
            
            // Show global error state
            const container = document.querySelector('.analytics-container');
            if (container) {
                container.innerHTML = `
                    <div class="analytics-header">
                        <div class="header-left">
                            <h1 class="analytics-title">Posture Analytics</h1>
                        </div>
                    </div>
                    <div class="analytics-content">
                        <div class="analytics-card" style="grid-column: 1 / -1;">
                            <div class="empty-state">
                                <div class="empty-state-icon">⚠️</div>
                                <div class="empty-state-text">Initialization Error</div>
                                <div class="empty-state-subtext">Failed to load analytics dashboard. Please refresh the page.</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    // Start initialization
    initialize();
});