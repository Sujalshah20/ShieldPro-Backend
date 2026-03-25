const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

/**
 * Creates a Nodemailer transporter configured for Gmail SMTP.
 * Uses GMAIL_USER and GMAIL_APP_PASSWORD from environment variables.
 */
const createTransporter = () => {
    const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
    
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.error('❌ Gmail SMTP credentials missing from environment variables (GMAIL_USER, GMAIL_APP_PASSWORD).');
        throw new Error('Email service configuration error: Missing credentials.');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Sends an email and optionally creates an in-app notification
 * @param {Object} options Options for the email
 * @param {string} options.to Recipient email address
 * @param {string} options.subject Email subject
 * @param {string} options.html HTML body of the email
 * @param {string} options.text Text body of the email (fallback)
 * 
 * @param {Object} notificationOpts Optional in-app notification options
 * @param {string} notificationOpts.userId Database ID of the user
 * @param {string} notificationOpts.title Notification title
 * @param {string} notificationOpts.message Notification details
 * @param {string} [notificationOpts.type='info'] Notification type ('info', 'success', 'warning', 'error')
 */
const sendEmail = async (options, notificationOpts = null) => {
    try {
        const fromEmail = (process.env.GMAIL_USER || 'onboarding@resend.dev').trim();
        const fromName = (process.env.FROM_NAME || 'ShieldPro Insurance').trim();
        const fromFormat = `"${fromName}" <${fromEmail}>`;

        const transporter = createTransporter();
        
        const mailOptions = {
            from: fromFormat,
            to: options.to,
            subject: options.subject,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
            html: options.html,
        };
        
        console.log(`Attempting to send email to ${options.to} via Gmail SMTP...`);
        const info = await transporter.sendMail(mailOptions);
        
        console.log('Email delivery successful: %s', info.messageId);

        // If notification options exist, create an in-app notification as well
        if (notificationOpts && notificationOpts.userId) {
            await Notification.create({
                user: notificationOpts.userId,
                title: notificationOpts.title || options.subject,
                message: notificationOpts.message || options.text || options.html.replace(/<[^>]*>?/gm, ''),
                type: notificationOpts.type || 'info'
            });
        }

        return info;
    } catch (error) {
        console.error('Email Delivery Error:', error);
        throw new Error(`Email delivery failed: ${error.message}`);
    }
};

module.exports = sendEmail;
