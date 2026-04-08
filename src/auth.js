const { delay, randomDelay, simulateHumanBehavior } = require('./utils');

/**
 * Checks if the current session is already logged in.
 * @param {import('puppeteer').Page} page 
 * @returns {Promise<boolean>}
 */
async function isLoggedIn(page) {
    try {
        // Check for common elements found only when logged in (dashboard nav, user profile)
        const loggedInSelectors = [
            '#nav-main',
            '[data-qa="user-button"]',
            '.up-n-nav-container',
            'button[aria-label="User Menu"]'
        ];
        
        for (const selector of loggedInSelectors) {
            const el = await page.$(selector);
            if (el) return true;
        }
        
        return false;
    } catch (err) {
        return false;
    }
}

/**
 * Performs the Upwork login flow.
 * @param {import('puppeteer').Page} page 
 * @param {string} username 
 * @param {string} password 
 */
async function performLogin(page, username, password) {
    console.log('[Auth] Attempting automated login...');
    
    // 1. Navigate to login page
    await page.goto('https://www.upwork.com/ab/account-security/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await randomDelay(2, 4);
    
    // Check if already logged in (sometimes it redirects automatically)
    if (await isLoggedIn(page)) {
        console.log('[Auth] Already logged in via session reuse.');
        return true;
    }

    // 2. Enter Username
    try {
        await page.waitForSelector('#login_username', { timeout: 10000 });
        console.log('[Auth] Entering username...');
        await page.type('#login_username', username, { delay: 100 });
        await randomDelay(1, 2);
        
        await page.click('#login_password_continue');
        console.log('[Auth] Clicked Continue...');
    } catch (err) {
        console.error('[Auth] Error entering username:', err.message);
        return false;
    }

    await randomDelay(2, 4);

    // 3. Enter Password
    try {
        await page.waitForSelector('#login_password', { timeout: 10000 });
        console.log('[Auth] Entering password...');
        await page.type('#login_password', password, { delay: 120 });
        await randomDelay(1, 2);
        
        // Ensure "Keep me logged in" is likely checked if visible
        // Usually checked by default on Upwork
        
        await page.click('#login_control_continue');
        console.log('[Auth] Clicked Log In...');
    } catch (err) {
        console.error('[Auth] Error entering password:', err.message);
        return false;
    }

    // 4. Handle Post-Login (MFA, Security Challenge, or Dashboard)
    console.log('[Auth] Waiting for dashboard or MFA challenge...');
    
    // We wait generic time for navigation/challenge
    try {
        // Wait for dashboard element OR a long timeout to allow manual MFA entry
        await page.waitForFunction(() => {
            return !!(document.querySelector('#nav-main') || 
                      document.querySelector('[data-qa="user-button"]') || 
                      document.body.innerText.includes('Two-factor authentication') ||
                      document.body.innerText.includes('security question'));
        }, { timeout: 30000 });
        
        if (await isLoggedIn(page)) {
            console.log('[Auth] Login successful!');
            return true;
        } else {
            console.log('[Auth] Security challenge detected (MFA or Security Question).');
            console.log('[Auth] You may need to handle this manually in the browser window.');
            
            // Wait up to 2 minutes for manual entry if headless=false
            await page.waitForFunction(() => {
                return !!(document.querySelector('#nav-main') || document.querySelector('[data-qa="user-button"]'));
            }, { timeout: 120000 }).catch(() => {});
            
            if (await isLoggedIn(page)) {
                console.log('[Auth] Login verified after manual intervention.');
                return true;
            } else {
                console.error('[Auth] Login failed or timeout during security challenge.');
                return false;
            }
        }
    } catch (err) {
        console.error('[Auth] Timeout waiting for login completion:', err.message);
        return false;
    }
}

module.exports = {
    isLoggedIn,
    performLogin
};
