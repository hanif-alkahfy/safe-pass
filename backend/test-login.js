const crypto = require('crypto');
const axios = require('axios');

// Configuration - Update these according to your .env file
const CONFIG = {
    API_BASE: 'http://localhost:3001',
    SERVER_SECRET: 'my_super_secret_key', // EXACT match with .env
    PIN: '123456', // Update with your MASTER_PIN from .env
    VERBOSE: true
};

class SafePassTester {
    constructor() {
        this.sessionId = null;
    }

    log(message, type = 'info') {
        if (!CONFIG.VERBOSE && type === 'debug') return;
        
        const icons = {
            info: 'ℹ️ ',
            success: '✅',
            error: '❌',
            debug: '🔍',
            step: '📋'
        };
        
        console.log(`${icons[type]} ${message}`);
    }

    async getHealthStatus() {
        try {
            const response = await axios.get(`${CONFIG.API_BASE}/health`);
            this.log('Server health check passed', 'success');
            return true;
        } catch (error) {
            this.log('Server health check failed - Is server running?', 'error');
            return false;
        }
    }

    async getChallengeToken() {
        try {
            this.log('Getting challenge token...', 'step');
            
            const response = await axios.get(`${CONFIG.API_BASE}/api/challenge`);
            
            // Debug: Log response structure
            this.log('Challenge API Response received', 'debug');
            if (CONFIG.VERBOSE) {
                console.log(JSON.stringify(response.data, null, 2));
            }
            
            // Handle actual response structure (no data wrapper)
            const responseData = response.data;
            
            if (!responseData.success) {
                this.log('Challenge API returned unsuccessful response', 'error');
                return null;
            }
            
            const { token, expiresAt, timestamp, csrf } = responseData;
            
            if (!token) {
                this.log('No token received from challenge API', 'error');
                return null;
            }
            
            this.log(`Challenge token: ${token.substring(0, 16)}...`, 'success');
            this.log(`CSRF token: ${csrf.substring(0, 16)}...`, 'debug');
            this.log(`Expires at: ${expiresAt}`, 'debug');
            this.log(`Server time: ${timestamp}`, 'debug');
            
            return { token, csrf, expiresAt, timestamp };
        } catch (error) {
            this.log('Failed to get challenge token', 'error');
            
            if (error.response) {
                this.log(`HTTP Status: ${error.response.status}`, 'error');
                this.log(`Response: ${JSON.stringify(error.response.data)}`, 'error');
            } else if (error.request) {
                this.log('No response received - is server running?', 'error');
            } else {
                this.log(`Error: ${error.message}`, 'error');
            }
            return null;
        }
    }

    generateHMAC(challengeToken, timestamp) {
        // Hash PIN dengan SERVER_SECRET (client-side hashing)
        const hashedPin = crypto.createHmac('sha256', CONFIG.SERVER_SECRET)
                        .update(CONFIG.PIN)
                        .digest('hex');
        
        /// Request body: kirim PIN plain
        const requestBodyObj = { pin: CONFIG.PIN };
        const bodyString = JSON.stringify(requestBodyObj);
        
        // HMAC message format: data|challengeToken|timestamp
        const message = `${bodyString}|${challengeToken}|${timestamp}`;
        
        // Generate HMAC
        const hmacSignature = crypto.createHmac('sha256', CONFIG.SERVER_SECRET)
                                   .update(message)
                                   .digest('hex');
        
        this.log(`PIN hashed (SERVER_SECRET): ${hashedPin.substring(0, 16)}...`, 'debug');
        this.log(`Request body: ${bodyString}`, 'debug');
        this.log(`HMAC Message: ${message.substring(0, 50)}...`, 'debug');
        this.log(`HMAC Signature: ${hmacSignature.substring(0, 16)}...`, 'debug');
        
        return {
            hashedPin,
            requestBody: requestBodyObj,
            hmacSignature
        };
    }

    async login() {
        try {
            this.log('Starting login process...', 'step');
            
            // Step 1: Get challenge token
            const challengeResponse = await this.getChallengeToken();
            if (!challengeResponse) return null;
            
            const { token: challengeToken, csrf } = challengeResponse;
            
            // Step 2: Prepare HMAC
            const timestamp = Date.now();
            const { hashedPin, requestBody, hmacSignature } = this.generateHMAC(
                challengeToken, 
                timestamp
            );
            
            this.log('Attempting login with HMAC verification...', 'step');
            
            // Step 3: Login request
            const response = await axios.post(
                `${CONFIG.API_BASE}/api/auth/verify-pin`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-HMAC-Signature': hmacSignature,
                        'X-Timestamp': timestamp.toString(),
                        'X-Challenge-Token': challengeToken,
                        'X-CSRF-Token': csrf // Include CSRF token if required
                    },
                    timeout: 10000 // 10 second timeout
                }
            );

            // Handle response structure based on actual API response
            let sessionData;
            if (response.data.data) {
                sessionData = response.data.data;
            } else {
                sessionData = response.data;
            }

            this.sessionId = sessionData.sessionId;
            const expiresAt = new Date(sessionData.expiresAt);
            
            this.log('LOGIN SUCCESSFUL!', 'success');
            this.log(`Session ID: ${this.sessionId.substring(0, 16)}...`, 'info');
            this.log(`Session expires: ${expiresAt.toISOString()}`, 'info');
            
            return this.sessionId;

        } catch (error) {
            this.log('LOGIN FAILED!', 'error');
            
            if (error.response) {
                const errorData = error.response.data;
                this.log(`Status: ${error.response.status}`, 'error');
                this.log(`Error: ${errorData.error || 'Unknown error'}`, 'error');
                this.log(`Code: ${errorData.code || 'Unknown code'}`, 'error');
                
                // Debug: Show full error response
                if (CONFIG.VERBOSE) {
                    console.log('Full error response:', JSON.stringify(errorData, null, 2));
                }
                
                if (errorData.data) {
                    if (errorData.data.attemptsRemaining !== undefined) {
                        this.log(`Attempts remaining: ${errorData.data.attemptsRemaining}`, 'info');
                    }
                    if (errorData.data.lockoutTime) {
                        this.log(`Lockout until: ${new Date(errorData.data.lockoutTime).toISOString()}`, 'info');
                    }
                }
            } else {
                this.log(`Network Error: ${error.message}`, 'error');
            }
            
            return null;
        }
    }

    async validateSession() {
        if (!this.sessionId) {
            this.log('No active session to validate', 'error');
            return false;
        }

        try {
            this.log('Validating session...', 'step');
            
            const response = await axios.get(
                `${CONFIG.API_BASE}/api/auth/session-status`,
                {
                    headers: {
                        'X-Session-Id': this.sessionId
                    }
                }
            );

            const { authenticated } = response.data.data;
            
            if (authenticated) {
                this.log('Session is valid', 'success');
            } else {
                this.log('Session is invalid', 'error');
            }
            
            return authenticated;
        } catch (error) {
            this.log(`Session validation failed: ${error.response?.data?.error || error.message}`, 'error');
            return false;
        }
    }

    async logout() {
        if (!this.sessionId) {
            this.log('No active session to logout', 'error');
            return false;
        }

        try {
            this.log('Logging out...', 'step');
            
            // Get new challenge token for logout
            const challengeResponse = await this.getChallengeToken();
            if (!challengeResponse) return false;
            
            const { token: challengeToken, csrf } = challengeResponse;
            
            const timestamp = Date.now();
            const requestBody = { sessionId: this.sessionId };
            const bodyString = JSON.stringify(requestBody);
            const message = `${bodyString}|${challengeToken}|${timestamp}`;
            
            const hmacSignature = crypto.createHmac('sha256', CONFIG.SERVER_SECRET)
                                       .update(message)
                                       .digest('hex');

            const response = await axios.post(
                `${CONFIG.API_BASE}/api/auth/logout`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-HMAC-Signature': hmacSignature,
                        'X-Timestamp': timestamp.toString(),
                        'X-Challenge-Token': challengeToken,
                        'X-CSRF-Token': csrf
                    }
                }
            );

            this.log('Logout successful', 'success');
            this.sessionId = null;
            return true;
        } catch (error) {
            this.log(`Logout failed: ${error.response?.data?.error || error.message}`, 'error');
            if (error.response && CONFIG.VERBOSE) {
                console.log('Logout error response:', JSON.stringify(error.response.data, null, 2));
            }
            return false;
        }
    }

    async getStats() {
        try {
            this.log('Getting system statistics...', 'step');
            
            const authStats = await axios.get(`${CONFIG.API_BASE}/api/auth/stats`);
            const hmacStats = await axios.get(`${CONFIG.API_BASE}/api/hmac/stats`);
            const lockoutStatus = await axios.get(`${CONFIG.API_BASE}/api/auth/lockout-status`);
            
            console.log('\n📊 Authentication Statistics:');
            console.log(JSON.stringify(authStats.data.data, null, 2));
            
            console.log('\n🔐 HMAC Statistics:');
            console.log(JSON.stringify(hmacStats.data.data, null, 2));
            
            console.log('\n🔒 Lockout Status:');
            console.log(JSON.stringify(lockoutStatus.data.data, null, 2));
            
        } catch (error) {
            this.log(`Failed to get statistics: ${error.message}`, 'error');
        }
    }

    async runFullTest() {
        console.log('🚀 Starting SafePass Full Authentication Test\n');
        console.log('⚙️  Configuration:');
        console.log(`   API Base: ${CONFIG.API_BASE}`);
        console.log(`   PIN: ${'*'.repeat(CONFIG.PIN.length)}`);
        console.log(`   Server Secret: ${CONFIG.SERVER_SECRET.substring(0, 8)}...`);
        console.log('');

        // Health check
        const healthy = await this.getHealthStatus();
        if (!healthy) return;

        // Login test
        const sessionId = await this.login();
        if (!sessionId) return;

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Session validation test
        await this.validateSession();

        // Wait a bit more
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Logout test
        await this.logout();

        // Statistics
        console.log('\n' + '='.repeat(50));
        await this.getStats();
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'full';
    
    const tester = new SafePassTester();

    switch (command) {
        case 'health':
            await tester.getHealthStatus();
            break;
        case 'challenge':
            await tester.getChallengeToken();
            break;
        case 'login':
            await tester.login();
            break;
        case 'session':
            await tester.validateSession();
            break;
        case 'logout':
            await tester.logout();
            break;
        case 'stats':
            await tester.getStats();
            break;
        case 'full':
        default:
            await tester.runFullTest();
            break;
    }
}

// Error handling
process.on('uncaughtException', (error) => {
    console.log('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('❌ Unhandled Rejection:', reason);
});

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = SafePassTester;