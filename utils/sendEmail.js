const nodemailer = require('nodemailer');
const dns = require('dns');
const Notification = require('../models/Notification');

/**
 * Creates a Nodemailer transporter configured for Gmail SMTP.
 * Enhanced for cloud environments like Render (timeouts + STRICT IPv4 forcing).
 */
const createTransporter = () => {
    const GMAIL_USER = process.env.GMAIL_USER || process.env.SMTP_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
    
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.error('❌ Gmail SMTP credentials missing from environment variables (GMAIL_USER/SMTP_USER, GMAIL_APP_PASSWORD/SMTP_PASS).');
        throw new Error('Email service configuration error: Missing credentials.');
    }

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL (Bypasses port 587 firewall blocking on Render)
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD,
        },
        // STRICT IPv4 Force via custom lookup
        lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { family: 4 }, (err, address, family) => {
                if (err) return callback(err);
                callback(null, address, family);
            });
        },
        family: 4,
        connectionTimeout: 60000,
        greetingTimeout: 60000,
        socketTimeout: 60000,
        tls: {
            rejectUnauthorized: false, // Set to true for production if certificates are verified
            servername: 'smtp.gmail.com'
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
        const fromEmail = (process.env.GMAIL_USER || process.env.SMTP_USER || 'noreply@shieldpro.in').trim();
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
