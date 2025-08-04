// Environment Configuration
// Update this file when deploying to production

const config = {
    // Development server URL
    development: {
        serverUrl: 'http://localhost:3001'
    },
    
    // Production server URL - UPDATE THIS WITH YOUR ACTUAL RENDER URL
    production: {
        serverUrl: 'https://partition-games-server.onrender.com'  // Replace with your actual Render URL
    },
    
    // Helper function to get the appropriate server URL
    getServerUrl: function() {
        const isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1';
        return isProduction ? this.production.serverUrl : this.development.serverUrl;
    }
};

// Make it available globally
window.GameConfig = config; 