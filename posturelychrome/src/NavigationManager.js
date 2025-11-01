/**
 * NavigationManager - Handles navigation between extension pages and session state
 */
class NavigationManager {
    constructor() {
        this.currentPage = null;
        this.sessionState = {};
        this.resourceCleanupCallbacks = [];
        this.init();
    }

    init() {
        // Detect current page
        this.detectCurrentPage();
        
        // Setup navigation event listeners
        this.setupNavigationListeners();
        
        // Handle browser back/forward navigation
        window.addEventListener('popstate', (event) => {
            this.handleBrowserNavigation(event);
        });

        // Handle page unload cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    detectCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('sidepanel.html')) {
            this.currentPage = 'main';
        } else if (path.includes('scan.html')) {
            this.currentPage = 'scan';
        } else if (path.includes('exercises.html')) {
            this.currentPage = 'exercises';
        } else if (path.includes('achievements.html')) {
            this.currentPage = 'achievements';
        } else if (path.includes('analytics.html')) {
            this.currentPage = 'analytics';
        }
    }

    setupNavigationListeners() {
        // Setup back button listeners for each page
        document.addEventListener('click', (event) => {
            if (event.target.matches('[data-nav-back]')) {
                event.preventDefault();
                this.navigateBack();
            }
            
            if (event.target.matches('[data-nav-to]')) {
                event.preventDefault();
                const destination = event.target.getAttribute('data-nav-to');
                this.navigateTo(destination);
            }
        });
    }

    navigateTo(destination, options = {}) {
        console.log(`Navigating to: ${destination}`);
        
        // Save current session state if needed
        if (options.saveState) {
            this.saveSessionState(options.saveState);
        }

        // Cleanup current page resources
        this.cleanup();

        // Navigate to destination
        switch (destination) {
            case 'main':
                window.location.href = 'sidepanel.html';
                break;
            case 'scan':
                window.location.href = 'scan.html';
                break;
            case 'exercises':
                window.location.href = 'exercises.html';
                break;
            case 'achievements':
                window.location.href = 'achievements.html';
                break;
            case 'analytics':
                window.location.href = 'analytics.html';
                break;
            default:
                console.warn(`Unknown navigation destination: ${destination}`);
        }
    }

    navigateBack() {
        console.log('Navigating back from:', this.currentPage);
        
        // Cleanup current page resources
        this.cleanup();

        // Determine back navigation based on current page
        switch (this.currentPage) {
            case 'scan':
            case 'exercises':
            case 'achievements':
            case 'analytics':
                this.navigateTo('main');
                break;
            case 'main':
                // Close extension or stay on main page
                if (window.history.length > 1) {
                    window.history.back();
                }
                break;
            default:
                this.navigateTo('main');
        }
    }

    handleBrowserNavigation(event) {
        // Handle browser back/forward buttons
        this.cleanup();
        this.detectCurrentPage();
    }

    // Session state management
    saveSessionState(stateData) {
        this.sessionState[this.currentPage] = {
            ...stateData,
            timestamp: Date.now()
        };
        
        // Persist to chrome storage for recovery
        if (chrome?.storage?.local) {
            chrome.storage.local.set({
                'navigationSessionState': this.sessionState
            });
        }
    }

    loadSessionState(page) {
        return this.sessionState[page] || null;
    }

    clearSessionState(page = null) {
        if (page) {
            delete this.sessionState[page];
        } else {
            this.sessionState = {};
        }
        
        if (chrome?.storage?.local) {
            chrome.storage.local.set({
                'navigationSessionState': this.sessionState
            });
        }
    }

    // Resource cleanup management
    registerCleanupCallback(callback) {
        this.resourceCleanupCallbacks.push(callback);
    }

    cleanup() {
        console.log('Cleaning up resources for navigation');
        
        // Execute all registered cleanup callbacks
        this.resourceCleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error during resource cleanup:', error);
            }
        });
        
        // Clear callbacks for next page
        this.resourceCleanupCallbacks = [];
    }

    // Exercise-specific navigation methods
    handleExerciseCompletion(exerciseType, completionData) {
        console.log(`Exercise completed: ${exerciseType}`);
        
        // Save completion data
        this.saveSessionState({
            type: 'exerciseCompletion',
            exerciseType,
            completionData,
            completedAt: Date.now()
        });

        // Show completion options
        this.showCompletionOptions();
    }

    showCompletionOptions() {
        // Create completion modal or update UI
        const completionModal = document.createElement('div');
        completionModal.className = 'completion-modal';
        completionModal.innerHTML = `
            <div class="completion-content">
                <h3>Exercise Complete!</h3>
                <p>Great job! What would you like to do next?</p>
                <div class="completion-actions">
                    <button data-nav-to="exercises" class="btn-primary">Try Another Exercise</button>
                    <button data-nav-to="achievements" class="btn-secondary">View Achievements</button>
                    <button data-nav-to="main" class="btn-secondary">Back to Main</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(completionModal);
        
        // Auto-remove after 10 seconds if no action
        setTimeout(() => {
            if (completionModal.parentNode) {
                completionModal.remove();
            }
        }, 10000);
    }

    // Error recovery
    handleNavigationError(error) {
        console.error('Navigation error:', error);
        
        // Attempt recovery by going to main page
        try {
            this.cleanup();
            this.navigateTo('main');
        } catch (recoveryError) {
            console.error('Recovery navigation failed:', recoveryError);
            // Last resort - reload the extension
            window.location.reload();
        }
    }

    // Pause/Resume functionality for exercises
    pauseCurrentSession() {
        const currentState = this.getCurrentPageState();
        if (currentState && currentState.pause) {
            currentState.pause();
            this.saveSessionState({
                type: 'paused',
                pausedAt: Date.now()
            });
        }
    }

    resumeCurrentSession() {
        const sessionState = this.loadSessionState(this.currentPage);
        if (sessionState && sessionState.type === 'paused') {
            const currentState = this.getCurrentPageState();
            if (currentState && currentState.resume) {
                currentState.resume();
                this.clearSessionState(this.currentPage);
            }
        }
    }

    getCurrentPageState() {
        // Return the current page's controller/manager instance
        switch (this.currentPage) {
            case 'scan':
                return window.scanPageController;
            case 'exercises':
                return window.exercisePageController;
            default:
                return null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
} else {
    window.NavigationManager = NavigationManager;
}