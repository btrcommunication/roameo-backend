const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin.json');

// Initialize Firebase Admin App
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

/**
 * Sends a push notification to a specific device token
 * @param {string} token - The FCM Device Push Token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload (e.g. adId)
 */
const sendPushNotification = async (token, title, body, data = {}) => {
    try {
        const message = {
            notification: {
                title,
                body
            },
            data: data,
            token: token
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

/**
 * Sends a push notification to multiple device tokens (Multicast)
 * Useful for broad marketing campaigns.
 */
const sendMulticastPushNotification = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) return;
    
    try {
        const message = {
            notification: {
                title,
                body
            },
            data,
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(response.successCount + ' messages were sent successfully');
        return response;
    } catch (error) {
        console.error('Error sending multicast message:', error);
        throw error;
    }
};

module.exports = {
    sendPushNotification,
    sendMulticastPushNotification,
    admin
};
