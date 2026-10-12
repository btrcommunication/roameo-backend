let initializeApp, cert, getApps, getMessaging;

try {
    const appModule = require('firebase-admin/app');
    const msgModule = require('firebase-admin/messaging');
    initializeApp = appModule.initializeApp;
    cert = appModule.cert;
    getApps = appModule.getApps;
    getMessaging = msgModule.getMessaging;
} catch (_) {
    // Compat fallback if sub-modules not available
    const adminRoot = require('firebase-admin');
    const root = adminRoot.default || adminRoot;
    initializeApp = root.initializeApp ? root.initializeApp.bind(root) : null;
    cert = (root.credential && root.credential.cert) ? root.credential.cert.bind(root.credential) : null;
    getApps = () => (root.apps || []);
    getMessaging = () => (root.messaging ? root.messaging() : null);
}

let isFirebaseInitialized = false;

try {
    const serviceAccount = require('../firebase-admin.json');
    if (getApps && !getApps().length && initializeApp && cert) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }
    isFirebaseInitialized = true;
    console.log('[Push Notification] Firebase Admin successfully initialized.');
} catch (initErr) {
    console.error('[Push Notification Error] Failed to initialize Firebase Admin:', initErr.message);
}

/**
 * Sends a push notification to a specific device token
 * @param {string} token - The FCM Device Push Token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload (e.g. adId)
 */
const sendPushNotification = async (token, title, body, data = {}) => {
    if (!isFirebaseInitialized) {
        console.warn('[Push Notification] Firebase Admin is not initialized. Skipping single push.');
        return null;
    }

    try {
        console.log(`[Push Notification] Sending single push to token: ${token.substring(0, 15)}...`);
        const message = {
            notification: {
                title,
                body
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                    sound: 'default'
                }
            },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ),
            token: token
        };

        const messaging = getMessaging();
        const response = await messaging.send(message);
        console.log('[Push Notification] Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('[Push Notification Error] Failed to send message:', error);
        throw error;
    }
};

/**
 * Sends a push notification to multiple device tokens (Multicast)
 * Useful for broad marketing campaigns.
 */
const sendMulticastPushNotification = async (tokens, title, body, data = {}) => {
    if (!isFirebaseInitialized) {
        console.warn('[Push Notification] Firebase Admin is not initialized. Skipping multicast push.');
        return { successCount: 0, failureCount: 0, responses: [] };
    }

    if (!tokens || tokens.length === 0) {
        console.log('[Push Notification] No device tokens to send to. Skipping push notification.');
        return { successCount: 0, failureCount: 0, responses: [] };
    }

    console.log(`[Push Notification] Attempting multicast push to ${tokens.length} device(s). Title: "${title}"`);
    
    try {
        const message = {
            notification: {
                title,
                body
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'default',
                    sound: 'default'
                }
            },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ),
            tokens: tokens
        };

        const messaging = getMessaging();
        const response = await messaging.sendEachForMulticast(message);
        console.log(`[Push Notification] Multicast result: ${response.successCount} succeeded, ${response.failureCount} failed out of ${tokens.length} total.`);
        
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`[Push Notification Token Error] Token index ${idx} failed:`, resp.error?.code, resp.error?.message);
                }
            });
        }
        return response;
    } catch (error) {
        console.error('[Push Notification Error] Error sending multicast message:', error);
        throw error;
    }
};

module.exports = {
    sendPushNotification,
    sendMulticastPushNotification
};
