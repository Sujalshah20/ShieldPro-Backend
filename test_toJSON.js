const mongoose = require('mongoose');
const User = require('./models/User');

const testUser = new User({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    verificationToken: 'token123',
    otpRetryAttempts: 2
});

const json = testUser.toJSON();
console.log('JSON Output:', JSON.stringify(json, null, 2));

if (json.password === undefined && json.verificationToken === undefined && json.otpRetryAttempts === undefined) {
    console.log('SUCCESS: Sensitive fields excluded from JSON.');
} else {
    console.log('FAILURE: Sensitive fields still present in JSON.');
    process.exit(1);
}
