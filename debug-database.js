/**
 * Database Integration Debug Script
 * Add this to any game page to debug database connectivity issues
 */

console.log('🔍 Database Integration Debug Script Loaded');

// Test database connectivity
async function testDatabaseConnection() {
    console.log('🧪 Testing database connection...');
    
    try {
        // Check if config is available
        if (typeof window.GameConfig === 'undefined') {
            console.error('❌ GameConfig not found - config.js might not be loaded');
            return false;
        }
        
        const serverUrl = window.GameConfig.getServerUrl();
        console.log('🌐 Server URL:', serverUrl);
        
        // Check if database utils are available
        if (typeof window.DatabaseUtils === 'undefined') {
            console.error('❌ DatabaseUtils not found - database-utils.js might not be loaded');
            return false;
        }
        
        console.log('✅ DatabaseUtils found');
        
        // Test a simple database call
        const testData = {
            gameType: 'DEBUG',
            partitionData: '3 2 1',
            timestampPlayed: new Date().toISOString(),
            movesSequence: 'R0C1 R1C0',
            gameOutcome: 'A'
        };
        
        console.log('📤 Sending test data:', testData);
        
        const response = await fetch(`${serverUrl}/api/game-records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Database test successful:', result.record.id);
            return true;
        } else {
            const error = await response.json();
            console.error('❌ Database test failed:', error);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        return false;
    }
}

// Monitor game completion
function monitorGameCompletion() {
    console.log('👀 Monitoring game completion...');
    
    // Override the storeGameInDatabase method to add logging
    if (window.DatabaseUtils && window.DatabaseUtils.storeGameInDatabase) {
        const originalMethod = window.DatabaseUtils.storeGameInDatabase;
        
        window.DatabaseUtils.storeGameInDatabase = async function(...args) {
            console.log('🎮 Game completion detected!');
            console.log('📊 Game data:', {
                gameType: args[0],
                partition: args[1],
                moves: args[2],
                winner: args[3],
                startTime: args[4]
            });
            
            try {
                const result = await originalMethod.apply(this, args);
                console.log('✅ Game saved to database:', result);
                return result;
            } catch (error) {
                console.error('❌ Failed to save game:', error);
                throw error;
            }
        };
        
        console.log('✅ Game completion monitoring enabled');
    } else {
        console.error('❌ DatabaseUtils.storeGameInDatabase not found');
    }
}

// Check for common issues
function checkCommonIssues() {
    console.log('🔍 Checking for common issues...');
    
    const issues = [];
    
    // Check if we're on the right domain
    const isProduction = window.location.hostname === 'partitiongames.netlify.app' || 
                        window.location.hostname === 'www.partitiongames.netlify.app';
    
    if (!isProduction && window.location.hostname !== 'localhost') {
        issues.push('⚠️ Not on production domain - using development server URL');
    }
    
    // Check if required scripts are loaded
    if (typeof window.GameConfig === 'undefined') {
        issues.push('❌ config.js not loaded');
    }
    
    if (typeof window.DatabaseUtils === 'undefined') {
        issues.push('❌ database-utils.js not loaded');
    }
    
    // Check network connectivity
    if (!navigator.onLine) {
        issues.push('❌ Browser is offline');
    }
    
    if (issues.length === 0) {
        console.log('✅ No common issues detected');
    } else {
        console.log('⚠️ Issues found:');
        issues.forEach(issue => console.log('  ' + issue));
    }
    
    return issues;
}

// Run all checks
async function runDebugChecks() {
    console.log('🚀 Starting database integration debug...');
    
    checkCommonIssues();
    monitorGameCompletion();
    
    // Test database connection after a short delay
    setTimeout(async () => {
        const success = await testDatabaseConnection();
        if (success) {
            console.log('🎉 Database integration appears to be working correctly!');
            console.log('💡 If you\'re not seeing data in the database, check:');
            console.log('   1. Are you completing games? (not just starting them)');
            console.log('   2. Are there any console errors?');
            console.log('   3. Is the browser cache cleared?');
        } else {
            console.log('❌ Database integration has issues - check console for details');
        }
    }, 1000);
}

// Auto-run when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDebugChecks);
} else {
    runDebugChecks();
}

// Make functions available globally for manual testing
window.DebugDatabase = {
    testConnection: testDatabaseConnection,
    checkIssues: checkCommonIssues,
    runChecks: runDebugChecks
}; 