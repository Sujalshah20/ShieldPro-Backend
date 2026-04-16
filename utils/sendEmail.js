const axios = require('axios');
const Notification = require('../models/Notification');

/**
 * Sends an email via Brevo REST API and optionally creates an in-app notification.
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
 * @param {string} [notificationOpts.type='info'] Notification type
 */
const sendEmail = async (options, notificationOpts = null) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) {
            console.error('❌ BREVO_API_KEY is missing from environment variables.');
            throw new Error('Email service configuration error: Missing Brevo API Key.');
        }

        const fromEmail = (process.env.FROM_EMAIL || process.env.GMAIL_USER || 'noreply@shieldpro.com').trim();
        const fromName = (process.env.FROM_NAME || 'ShieldPro Insurance').trim();

        const emailData = {
            sender: {
                name: fromName,
                email: fromEmail
            },
            to: [
                {
                    email: options.to
                }
            ],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text || options.html.replace(/<[^>]*>?/gm, '')
        };

        console.log(`Attempting to send email to ${options.to} via Brevo HTTP API...`);
        
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            }
        });

        console.log('Email delivery successful via Brevo:', response.data.messageId);

        // If notification options exist, create an in-app notification
        if (notificationOpts && notificationOpts.userId) {
            await Notification.create({
                user: notificationOpts.userId,
                title: notificationOpts.title || options.subject,
                message: notificationOpts.message || options.text || options.html.replace(/<[^>]*>?/gm, ''),
                type: notificationOpts.type || 'info'
            });
        }

        return response.data;
    } catch (error) {
        console.error('Brevo Email Delivery Error:', error.response?.data || error.message);
        throw new Error(`Email delivery failed: ${error.response?.data?.message || error.message}`);
    }
};

module.exports = sendEmail;
