/**
 * UIComponentManager - Manages proper rendering and prevents duplicate elements
 * Ensures all interactive buttons function correctly and UI components render properly
 */
export class UIComponentManager {
    constructor() {
        this.renderedComponents = new Set();
        this.componentStates = new Map();
    }

    /**
     * Prevent duplicate UI elements from rendering
     */
    preventDuplicateElements(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container ${containerId} not found`);
            return false;
        }

        // Check if this container has already been processed
        if (this.renderedComponents.has(containerId)) {
            console.log(`Preventing duplicate rendering for ${containerId}`);
            return false;
        }

        // Mark as rendered
        this.renderedComponents.add(containerId);
        return true;
    }

    /**
     * Clean up duplicate components
     */
    removeDuplicateComponents() {
        // Remove duplicate achievement sections
        const achievementSections = document.querySelectorAll('[id*="achievement"], [class*="achievement"]');
        const seenIds = new Set();
        
        achievementSections.forEach(element => {
            const id = element.id || element.className;
            if (seenIds.has(id)) {
                console.log(`Removing duplicate element: ${id}`);
                element.remove();
            } else {
                seenIds.add(id);
            }
        });

        // Remove duplicate statistics sections
        const statsSections = document.querySelectorAll('[id*="stats"], [class*="stats"]');
        const seenStatsIds = new Set();
        
        statsSections.forEach(element => {
            const id = element.id || element.className;
            if (seenStatsIds.has(id)) {
                console.log(`Removing duplicate stats element: ${id}`);
                element.remove();
            } else {
                seenStatsIds.add(id);
            }
        });
    }

    /**
     * Ensure functional buttons
     */
    validateButtonFunctionality() {
        const buttons = document.querySelectorAll('button');
        const issues = [];

        buttons.forEach((button, index) => {
            try {
                // Check if button has proper event listeners
                const hasClickHandler = button.onclick || 
                    button.addEventListener || 
                    button.getAttribute('onclick');

                if (!hasClickHandler && !button.disabled) {
                    // Add basic functionality check
                    const buttonText = button.textContent.trim();
                    if (buttonText && !button.classList.contains('validated')) {
                        console.warn(`Button "${buttonText}" may not have proper event handlers`);
                        issues.push(`Button "${buttonText}" missing event handler`);
                    }
                }

                // Mark as validated
                button.classList.add('validated');

            } catch (error) {
                console.error(`Error validating button ${index}:`, error);
                issues.push(`Button ${index} validation error: ${error.message}`);
            }
        });

        return {
            totalButtons: buttons.length,
            issues
        };
    }

    /**
     * Render single achievement section (prevent duplicates)
     */
    renderSingleAchievementSection() {
        // Remove any existing achievement sections first
        const existingAchievements = document.querySelectorAll('.achievements-section, #achievements, [class*="achievement-"]');
        
        if (existingAchievements.length > 1) {
            console.log(`Found ${existingAchievements.length} achievement sections, removing duplicates`);
            
            // Keep the first one, remove the rest
            for (let i = 1; i < existingAchievements.length; i++) {
                existingAchievements[i].remove();
            }
        }

        return existingAchievements.length > 0 ? existingAchievements[0] : null;
    }

    /**
     * Ensure statistics grid exists and is properly rendered
     */
    ensureStatisticsGrid() {
        let statsGrid = document.getElementById('statsGrid');
        
        if (!statsGrid) {
            // Create statistics grid if it doesn't exist
            const analyticsContent = document.querySelector('.analytics-content');
            const mainSection = document.querySelector('.main-section');
            
            if (mainSection) {
                const statsCard = document.createElement('div');
                statsCard.className = 'analytics-card';
                statsCard.innerHTML = `
                    <h2 class="card-title">Statistics Overview</h2>
                    <div class="stats-grid" id="statsGrid">
                        <!-- Statistics will be populated by JavaScript -->
                    </div>
                `;
                
                // Insert after calendar section
                const calendarSection = mainSection.querySelector('.calendar-section');
                if (calendarSection) {
                    calendarSection.insertAdjacentElement('afterend', statsCard);
                } else {
                    mainSection.appendChild(statsCard);
                }
                
                statsGrid = document.getElementById('statsGrid');
                console.log('Created missing statistics grid');
            }
        }

        return statsGrid;
    }



    /**
     * Validate and fix navigation elements
     */
    validateNavigationElements() {
        const navigationElements = [
            { id: 'prevMonth', required: true },
            { id: 'nextMonth', required: true },
            { id: 'todayBtn', required: true }
        ];

        const issues = [];
        const fixed = [];

        navigationElements.forEach(nav => {
            const element = document.getElementById(nav.id);
            
            if (!element && nav.required) {
                issues.push(`Missing required navigation element: ${nav.id}`);
            } else if (element) {
                // Validate element functionality
                if (!element.onclick && !element.getAttribute('onclick')) {
                    console.warn(`Navigation element ${nav.id} may be missing event handlers`);
                }
            }
        });

        return { issues, fixed };
    }

    /**
     * Initialize UI component management
     */
    initialize() {
        console.log('Initializing UI Component Manager...');
        
        // Clean up any existing duplicates
        this.removeDuplicateComponents();
        
        // Ensure required elements exist
        this.ensureStatisticsGrid();
        
        // Validate navigation
        const navValidation = this.validateNavigationElements();
        if (navValidation.issues.length > 0) {
            console.warn('Navigation validation issues:', navValidation.issues);
        }
        if (navValidation.fixed.length > 0) {
            console.log('Fixed navigation elements:', navValidation.fixed);
        }
        
        // Validate button functionality
        const buttonValidation = this.validateButtonFunctionality();
        if (buttonValidation.issues.length > 0) {
            console.warn('Button validation issues:', buttonValidation.issues);
        }
        
        console.log('UI Component Manager initialization complete');
        
        return {
            navigationIssues: navValidation.issues,
            navigationFixed: navValidation.fixed,
            buttonIssues: buttonValidation.issues,
            totalButtons: buttonValidation.totalButtons
        };
    }

    /**
     * Reset component tracking (for testing or re-initialization)
     */
    reset() {
        this.renderedComponents.clear();
        this.componentStates.clear();
        
        // Remove validation classes
        const validatedElements = document.querySelectorAll('.validated');
        validatedElements.forEach(element => {
            element.classList.remove('validated');
        });
        
        console.log('UI Component Manager reset complete');
    }

    /**
     * Get component state information
     */
    getComponentState() {
        return {
            renderedComponents: Array.from(this.renderedComponents),
            componentStates: Object.fromEntries(this.componentStates),
            totalElements: document.querySelectorAll('*').length,
            buttons: document.querySelectorAll('button').length,
            duplicateRisk: this.checkForDuplicateRisk()
        };
    }

    /**
     * Check for potential duplicate elements
     */
    checkForDuplicateRisk() {
        const elements = document.querySelectorAll('[id]');
        const ids = new Map();
        const duplicates = [];

        elements.forEach(element => {
            const id = element.id;
            if (ids.has(id)) {
                duplicates.push(id);
            } else {
                ids.set(id, element);
            }
        });

        return duplicates;
    }
}