document.addEventListener('DOMContentLoaded', async function() {
    // Import modules with error handling
    let ComprehensiveAchievementManager, LocalizationService, DataIntegrityValidator;

    try {
        const modules = await Promise.all([
            import('./src/ComprehensiveAchievementManager.js'),
            import('./src/LocalizationService.js'),
            import('./src/DataIntegrityValidator.js')
        ]);
        
        ComprehensiveAchievementManager = modules[0].ComprehensiveAchievementManager;
        LocalizationService = modules[1].LocalizationService;
        DataIntegrityValidator = modules[2].DataIntegrityValidator;
        
        console.log('All modules loaded successfully');
    } catch (error) {
        console.error('Error loading modules:', error);
        // Create fallback classes to prevent script failure
        ComprehensiveAchievementManager = class { 
            async getComprehensiveAchievementData() { 
                return { 
                    summary: { earned: 0, total: 15, percentage: 0 },
                    achievements: [],
                    categories: {},
                    recentEarned: []
                }; 
            }
        };
        LocalizationService = class { 
            initialize() { return Promise.resolve(); }
            getAchievementTranslation(key) { return Promise.resolve(key); }
        };
        DataIntegrityValidator = class { 
            formatDuration(minutes) { 
                if (minutes < 60) return `${minutes}m`;
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
            }
        };
    }

    // DOM Elements
    const summaryStats = document.getElementById('summaryStats');
    const achievementCategories = document.getElementById('achievementCategories');

    // Initialize managers and services
    const achievementManager = new ComprehensiveAchievementManager();
    const localizationService = new LocalizationService();
    const dataValidator = new DataIntegrityValidator();

    // Initialize localization service
    await localizationService.initialize();
    achievementManager.setLocalizationService(localizationService);

    // Category icons and names
    const categoryInfo = {
        milestone: { icon: '🎯', name: 'Milestones' },
        streak: { icon: '🔥', name: 'Streaks' },
        time: { icon: '⏰', name: 'Time Tracking' },
        quality: { icon: '✨', name: 'Quality' },
        special: { icon: '🌟', name: 'Special' }
    };

    // Utility Functions
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function formatRequirement(requirement) {
        switch (requirement.type) {
            case 'sessions':
                return `Complete ${requirement.value} session${requirement.value > 1 ? 's' : ''}`;
            case 'total_minutes':
                return `Track for ${dataValidator.formatDuration(requirement.value)} total`;
            case 'daily_minutes':
                return `Track for ${dataValidator.formatDuration(requirement.value)} in one day`;
            case 'streak':
                return `Maintain ${requirement.value}-day streak`;
            case 'daily_score':
                return `Achieve ${requirement.value}+ average score in a day`;
            case 'weekly_score':
                return `Maintain ${requirement.value}+ average for a week`;
            case 'early_start':
                return `Start tracking before ${requirement.value}:00 AM`;
            case 'late_tracking':
                return `Track after ${requirement.value}:00 (10 PM)`;
            case 'mood_sessions':
                return `Log mood in ${requirement.value} sessions`;
            default:
                return 'Complete requirement';
        }
    }

    function createProgressRing(percentage) {
        const radius = 26;
        const circumference = 2 * Math.PI * radius;
        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
        
        return `
            <div class="progress-ring">
                <svg>
                    <circle class="progress-ring-bg" cx="30" cy="30" r="${radius}"></circle>
                    <circle class="progress-ring-fill" cx="30" cy="30" r="${radius}" 
                            style="stroke-dasharray: ${strokeDasharray}"></circle>
                </svg>
                <div class="progress-text">${percentage}%</div>
            </div>
        `;
    }

    // Render Summary Statistics
    function renderSummaryStats(data) {
        if (!summaryStats) return;

        const { summary } = data;
        
        summaryStats.innerHTML = `
            <div class="stat-card">
                ${createProgressRing(summary.percentage)}
                <div class="stat-value">${summary.earned}/${summary.total}</div>
                <div class="stat-label">Achievements Earned</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${summary.percentage}%</div>
                <div class="stat-label">Completion Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${15 - summary.earned}</div>
                <div class="stat-label">Remaining</div>
            </div>
        `;
    }

    // Render Achievement Categories
    function renderAchievementCategories(data) {
        if (!achievementCategories) return;

        const { categories } = data;
        let html = '';

        Object.entries(categories).forEach(([categoryKey, category]) => {
            const categoryData = categoryInfo[categoryKey] || { icon: '🏅', name: categoryKey };
            
            html += `
                <div class="achievement-category">
                    <div class="category-header">
                        <div class="category-name">
                            <span>${categoryData.icon}</span>
                            ${categoryData.name}
                        </div>
                        <div class="category-progress">${category.earned}/${category.total}</div>
                    </div>
                    <div class="achievement-grid">
                        ${category.achievements.map(achievement => renderAchievementItem(achievement)).join('')}
                    </div>
                </div>
            `;
        });

        achievementCategories.innerHTML = html;
    }

    // Render Individual Achievement Item
    function renderAchievementItem(achievement) {
        const statusClass = achievement.isEarned ? 'earned' : 
                           achievement.progress > 0 ? 'in-progress' : 'locked';
        
        const statusBadge = achievement.isEarned ? 'earned' : 
                           achievement.progress > 0 ? 'in-progress' : 'locked';

        const progressBar = !achievement.isEarned ? `
            <div class="achievement-progress-container">
                <div class="achievement-progress-bar">
                    <div class="achievement-progress-fill" style="width: ${achievement.progress}%"></div>
                </div>
                <div class="achievement-progress-text">${achievement.progress}% complete</div>
            </div>
        ` : '';

        const earnedDate = achievement.isEarned && achievement.earnedDate ? `
            <div class="achievement-earned-date">
                Earned on ${formatDate(achievement.earnedDate)}
            </div>
        ` : '';

        return `
            <div class="achievement-item ${statusClass}">
                <div class="achievement-status-badge status-${statusBadge}">
                    ${achievement.isEarned ? 'Earned' : achievement.progress > 0 ? 'In Progress' : 'Locked'}
                </div>
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-requirement">${formatRequirement(achievement.requirement)}</div>
                    ${progressBar}
                    ${earnedDate}
                </div>
            </div>
        `;
    }



    // Show loading state
    function showLoadingState() {
        if (summaryStats) summaryStats.classList.add('loading');
        if (achievementCategories) achievementCategories.classList.add('loading');
    }

    // Clear loading state
    function clearLoadingState() {
        if (summaryStats) summaryStats.classList.remove('loading');
        if (achievementCategories) achievementCategories.classList.remove('loading');
    }

    // Show error state
    function showErrorState(message) {
        const errorHtml = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">Error</div>
                <div class="empty-state-subtext">${message}</div>
            </div>
        `;

        if (summaryStats) summaryStats.innerHTML = errorHtml;
        if (achievementCategories) achievementCategories.innerHTML = errorHtml;
    }

    // Load and render all achievement data
    async function loadAchievements() {
        try {
            showLoadingState();

            // Get comprehensive achievement data
            const achievementData = await achievementManager.getComprehensiveAchievementData();
            
            console.log('Achievement data loaded:', achievementData);

            // Render all sections
            renderSummaryStats(achievementData);
            renderAchievementCategories(achievementData);

            clearLoadingState();

        } catch (error) {
            console.error('Error loading achievements:', error);
            clearLoadingState();
            showErrorState('Failed to load achievement data');
        }
    }

    // Initialize the page
    async function initialize() {
        try {
            console.log('Initializing achievements page...');
            
            // Load achievement data
            await loadAchievements();
            
            console.log('Achievements page initialization complete');

        } catch (error) {
            console.error('Critical error during achievements initialization:', error);
            showErrorState('Failed to initialize achievements page');
        }
    }

    // Start initialization
    initialize();
});