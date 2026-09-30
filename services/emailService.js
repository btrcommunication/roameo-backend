const nodemailer = require("nodemailer");
const emailTemplates = require("./emailTemplates");

/**
 * Creates and returns a Nodemailer transporter instance using environment variables.
 */
const createTransporter = () => {
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "btrcommunication.com",
        port,
        secure, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER || "roameo@btrcommunication.com",
            pass: process.env.SMTP_PASS || ""
        },
        tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
        }
    });
};

/**
 * Generic email sender
 * @param {Object} options
 * @param {string} options.to - Recipient email address(es)
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text content
 * @param {string} [options.html] - HTML content
 * @param {string} [options.from] - Sender address (optional, defaults to process.env.EMAIL_FROM)
 * @param {Array} [options.attachments] - Optional attachments
 * @returns {Promise<Object>}
 */
const sendEmail = async ({ to, subject, text, html, from, attachments }) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: from || process.env.EMAIL_FROM || `"Roameo" <${process.env.SMTP_USER || "roameo@btrcommunication.com"}>`,
            to,
            subject,
            text,
            html,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EmailService] Error sending email to ${to}:`, error.message);
        throw error;
    }
};

/**
 * 1. Send Welcome Email to Customer
 */
const sendWelcomeEmail = async (to, data) => {
    const { subject, html, text } = emailTemplates.welcomeCustomerTemplate(data);
    return sendEmail({ to, subject, html, text });
};

/**
 * 2. Send Order Completion Email to Customer
 */
const sendOrderCompletedEmail = async (to, data) => {
    const { subject, html, text } = emailTemplates.orderCompletedTemplate(data);
    return sendEmail({ to, subject, html, text });
};

/**
 * 3. Send Vendor Acceptance Email
 */
const sendVendorAcceptedEmail = async (to, data) => {
    const { subject, html, text } = emailTemplates.vendorAcceptedTemplate(data);
    return sendEmail({ to, subject, html, text });
};

/**
 * 4. Send Vendor Rejection Email
 */
const sendVendorRejectedEmail = async (to, data) => {
    const { subject, html, text } = emailTemplates.vendorRejectedTemplate(data);
    return sendEmail({ to, subject, html, text });
};

/**
 * 5. Send Coupon Approval Email
 */
const sendCouponApprovedEmail = async (to, data) => {
    const { subject, html, text } = emailTemplates.couponApprovedTemplate(data);
    return sendEmail({ to, subject, html, text });
};

/**
 * 6. Send Coupon Rejection Email
 */
const sendCouponRejectedEmail = async (to, data) => {
    const { subject, html, text } = emailTemplates.couponRejectedTemplate(data);
    return sendEmail({ to, subject, html, text });
};

/**
 * Verifies SMTP connection configuration
 * @returns {Promise<boolean>}
 */
const verifyConnection = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log("[EmailService] SMTP connection verified successfully.");
        return true;
    } catch (error) {
        console.error("[EmailService] SMTP connection verification failed:", error.message);
        return false;
    }
};

module.exports = {
    sendEmail,
    verifyConnection,
    createTransporter,
    templates: emailTemplates,
    sendWelcomeEmail,
    sendOrderCompletedEmail,
    sendVendorAcceptedEmail,
    sendVendorRejectedEmail,
    sendCouponApprovedEmail,
    sendCouponRejectedEmail
};
