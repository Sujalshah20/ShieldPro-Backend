const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

// To properly send emails, set up your variables in .env
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, FROM_NAME

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER, 
            pass: process.env.SMTP_PASS, 
        },
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
        const transporter = createTransporter();

        const mailOptions = {
            from: `"${process.env.FROM_NAME || 'ShieldPro Insurance'}" <${process.env.FROM_EMAIL || 'noreply@shieldpro.com'}>`,
            to: options.to,
            subject: options.subject,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ''), // Strip html if no text provided
            html: options.html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);

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
