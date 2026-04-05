require('dotenv').config();
const axios = require('axios');

async function testEmail() {
    try {
        console.log("Checking environment variables...");
        if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY is missing!");
        
        console.log("Attempting to send a test email via Brevo...");
        
        const emailData = {
            sender: {
                name: process.env.FROM_NAME || 'ShieldPro Insurance',
                email: process.env.FROM_EMAIL || 'shahsujal14@gmail.com'
            },
            to: [ { email: 'sujal112222@gmail.com' } ],
            subject: 'Test Email Delivery (Brevo)',
            htmlContent: '<p>If you receive this, the Brevo API Key is working perfectly!</p>'
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            }
        });

        console.log("✅ Email sent successfully:", response.data);
    } catch (err) {
        console.error("❌ Email failed:", err.response?.data || err.message);
    }
}

testEmail();
