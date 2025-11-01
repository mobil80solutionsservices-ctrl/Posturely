/**
 * ThemeSynchronizationService - Manages theme synchronization between main extension and analytics dashboard
 * Ensures consistent theming across all extension interfaces
 */
export class ThemeSynchronizationService {
    constructor() {
        this.currentTheme = null;
        this.listeners = [];
        this.storageKey = 'theme';
        
        // Initialize theme synchronization
        this.initialize();
    }

    /**
     * Initialize the theme synchronization service
     */
    async initialize() {
        // Load current theme from storage
        await this.loadTheme();
        
        // Listen for storage changes to sync theme across tabs
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes[this.storageKey]) {
                const newTheme = changes[this.storageKey].newValue;
                if (newTheme !== this.currentTheme) {
                    this.currentTheme = newTheme;
                    this.notifyListeners(newTheme);
                }
            }
        });
    }

    /**
     * Load theme from storage
     */
    async loadTheme() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.storageKey], (result) => {
                let theme = result[this.storageKey];
                
                // If no theme is saved, detect system preference
                if (!theme) {
                    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                
                this.currentTheme = theme;
                resolve(theme);
            });
        });
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Set theme and persist across browser sessions
     */
    async setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.warn('Invalid theme value:', theme);
            return;
        }

        this.currentTheme = theme;
        
        // Persist theme preference
        chrome.storage.local.set({ [this.storageKey]: theme });
        
        // Notify all listeners
        this.notifyListeners(theme);
    }

    /**
     * Apply theme to the current document
     */
    applyTheme(theme = this.currentTheme) {
        if (!theme) return;

        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        
        // Update theme toggle button if it exists
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Add a listener for theme changes
     */
    addThemeChangeListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    /**
     * Remove a theme change listener
     */
    removeThemeChangeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of theme changes
     */
    notifyListeners(theme) {
        this.listeners.forEach(callback => {
            try {
                callback(theme);
            } catch (error) {
                console.error('Error in theme change listener:', error);
            }
        });
    }

    /**
     * Sync theme automatically when analytics dashboard loads
     */
    async syncThemeOnLoad() {
        const theme = await this.loadTheme();
        this.applyTheme(theme);
        return theme;
    }

    /**
     * Setup theme synchronization for analytics dashboard
     */
    setupAnalyticsSync() {
        // Apply theme immediately
        this.applyTheme();
        
        // Add listener for theme changes from main extension
        this.addThemeChangeListener((theme) => {
            this.applyTheme(theme);
        });
    }

    /**
     * Setup theme synchronization for main sidepanel
     */
    setupSidepanelSync() {
        // Apply theme immediately
        this.applyTheme();
        
        // Setup theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }
}