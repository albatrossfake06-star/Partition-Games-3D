/**
 * Partition Games - Main JavaScript File
 * Handles interactive functionality across the application
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAboutPopover();
    // Space for future functionality initialization
});

/**
 * About Popover Functionality
 * Handles showing/hiding the about section in a popover
 */
function initializeAboutPopover() {
    const aboutBtn = document.getElementById('about-btn');
    const aboutPopover = document.getElementById('about-popover');
    const closeBtn = document.getElementById('close-about');

    if (!aboutBtn || !aboutPopover || !closeBtn) {
        console.warn('About popover elements not found');
        return;
    }

    // Show popover when about button is clicked
    aboutBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePopover(true);
    });

    // Hide popover when close button is clicked
    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        togglePopover(false);
    });

    // Hide popover when clicking outside
    document.addEventListener('click', function(e) {
        if (!aboutPopover.contains(e.target) && e.target !== aboutBtn) {
            togglePopover(false);
        }
    });

    // Prevent popover from closing when clicking inside it
    aboutPopover.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Hide popover on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            togglePopover(false);
        }
    });

    /**
     * Toggle popover visibility
     * @param {boolean} show - Whether to show or hide the popover
     */
    function togglePopover(show) {
        if (show) {
            aboutPopover.classList.remove('hidden');
            aboutBtn.setAttribute('aria-expanded', 'true');
            // Focus on close button for accessibility
            closeBtn.focus();
        } else {
            aboutPopover.classList.add('hidden');
            aboutBtn.setAttribute('aria-expanded', 'false');
        }
    }
}

/**
 * Utility Functions
 * Collection of helper functions for future use
 */

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Simple event emitter for component communication
 */
class SimpleEventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

// Global event emitter instance for cross-component communication
window.gameEvents = new SimpleEventEmitter();

/**
 * Future functionality placeholders
 */

// Placeholder for game statistics tracking
function initializeGameStats() {
    // TODO: Implement game statistics tracking
}

// Placeholder for user preferences
function initializeUserPreferences() {
    // TODO: Implement user preferences (theme, difficulty, etc.)
}

// Placeholder for multiplayer functionality
function initializeMultiplayer() {
    // TODO: Implement multiplayer initialization
}

// Placeholder for offline functionality
function initializeOfflineSupport() {
    // TODO: Implement service worker and offline capabilities
}