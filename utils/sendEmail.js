const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const dns = require('dns');
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
        host: SMTP_HOST || 'smtp.googlemail.com', // googlemail is often more stable for IPv4
        port: port,
        secure: isSecure,
        auth: {
            user: SMTP_USER, 
            pass: SMTP_PASS, 
        },
        // Force IPv4 via custom lookup
        lookup: (hostname, options, callback) => {
            dns.lookup(hostname, { family: 4 }, (err, address, family) => {
                if (err) return callback(err);
                console.log(`Resolved ${hostname} to ${address} (IPv${family})`);
                callback(null, address, family);
            });
        },
        tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
            // Some environments need family set here as well
            servername: SMTP_HOST || 'smtp.googlemail.com'
        },
        connectionTimeout: 45000, // Further increased for slow handshakes
        greetingTimeout: 45000,
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
        const fromEmail = (process.env.FROM_EMAIL || 'onboarding@resend.dev').trim();
        const fromName = (process.env.FROM_NAME || 'ShieldPro Insurance').trim();
        const fromFormat = `"${fromName}" <${fromEmail}>`;

        // Safety: If using Resend with a gmail/yahoo/outlook address, it WILL fail 
        // because Resend requires a verified custom domain for those.
        // We use a more robust check and trim the email.
        const isPublicDomain = /@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)$/i.test(fromEmail);

        let info;
        let success = false;

        // Use Resend API ONLY if configured AND it's not a public domain (Restricted by Resend)
        // OR if the user is explicitly using the onboarding email for testing.
        if (resend && (!isPublicDomain || fromEmail === 'onboarding@resend.dev')) {
            try {
                console.log('Attempting Resend API delivery...');
                const { data, error } = await resend.emails.send({
                    from: fromFormat,
                    to: [options.to],
                    subject: options.subject,
                    html: options.html,
                    text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
                });

                if (error) throw error;
                info = { messageId: data.id };
                success = true;
                console.log('Resend delivery successful.');
            } catch (resendError) {
                const isRestrictionError = resendError.message?.toLowerCase().includes('own email address');
                if (isRestrictionError) {
                    console.warn('Resend API is in TEST MODE. Only owner can receive emails.');
                }
                console.warn(`Resend failed: ${resendError.message}. Falling back to SMTP...`);
            }
        }

        // Fallback to SMTP or use it primarily if Resend is not suitable
        if (!success) {
            const { SMTP_HOST, SMTP_PORT } = process.env;
            const targetHost = SMTP_HOST || 'smtp.googlemail.com';
            console.log(`Using SMTP for delivery (${targetHost}:${SMTP_PORT || 465})...`);
            const transporter = createTransporter();
            const mailOptions = {
                from: fromFormat,
                to: options.to,
                subject: options.subject,
                text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
                html: options.html,
            };
            
            info = await transporter.sendMail(mailOptions);
            success = true;
            console.log('SMTP delivery successful.');
        }

        console.log('Message sent: %s', info.messageId || info.id || 'N/A');

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
        console.error('Final Email Delivery Error:', error);
        // Throw error so calling function can handle failure (e.g., rollback database changes)
        throw new Error(`Email delivery failed: ${error.message}`);
    }
};

module.exports = sendEmail;
