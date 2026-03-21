const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const Notification = require('../models/Notification');

// Initialize Resend if API key is present
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// To properly send emails, set up your variables in .env
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, FROM_NAME

const createTransporter = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    
    if (!SMTP_USER || !SMTP_PASS) {
        console.warn('⚠️ SMTP credentials missing. Using Ethereal fallback.');
    }

    // Default to 465 for cloud environments if not specified
    const port = parseInt(SMTP_PORT, 10) || 465;
    const isSecure = port === 465;

    return nodemailer.createTransport({
        host: SMTP_HOST || 'smtp.gmail.com',
        port: port,
        secure: isSecure,
        auth: {
            user: SMTP_USER, 
            pass: SMTP_PASS, 
        },
        tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2'
        },
        connectionTimeout: 10000, 
        greetingTimeout: 10000,
        // Force IPv4 to avoid ENETUNREACH issues with IPv6 on some cloud providers
        family: 4
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
        const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
        const fromName = process.env.FROM_NAME || 'ShieldPro Insurance';
        const fromFormat = `"${fromName}" <${fromEmail}>`;

        let info;

        // Use Resend API if configured (Bypasses SMTP port blocking on Render)
        if (resend) {
            console.log('Using Resend API for delivery...');
            const { data, error } = await resend.emails.send({
                from: fromFormat,
                to: [options.to],
                subject: options.subject,
                html: options.html,
                text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
            });

            if (error) throw error;
            info = { messageId: data.id };
        } else {
            // Fallback to SMTP (for local dev)
            console.log('Using SMTP for delivery...');
            const transporter = createTransporter();
            const mailOptions = {
                from: fromFormat,
                to: options.to,
                subject: options.subject,
                text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
                html: options.html,
            };
            info = await transporter.sendMail(mailOptions);
        }

        console.log('Message sent: %s', info.messageId || info.id);

        // If notification options exist, create an in-app notification as well
        if (notificationOpts && notificationOpts.userId) {
            await Notification.create({
                user: notificationOpts.userId,
                title: notificationOpts.title || options.subject,
                message: notificationOpts.message || options.text || 'You have a new message.',
                type: notificationOpts.type || 'info'
            });
        }

        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        // Throw error so calling function can handle failure (e.g., rollback database changes)
        throw new Error(`Email delivery failed: ${error.message}`);
    }
};

module.exports = sendEmail;
