const AWS = require('aws-sdk');
const crypto = require('crypto');

AWS.config.update({ region: 'ap-south-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

const CLIENT_ID = '6dd3p6pudipgc6lnshepcqt4ih';
const CLIENT_SECRET = 'ltj68lm7h7o847m1978gcg9f7q5l0orab89rfjg88qfedn14ir3';

function generateSecretHash(username) {
    return crypto.createHmac('SHA256', CLIENT_SECRET)
        .update(username + CLIENT_ID)
        .digest('base64');
}

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { email, code, newPassword } = body;

        // Forgot Password (Send Code)
        if (!code && !newPassword) {
            if (!email) {
                return { statusCode: 400, body: JSON.stringify({ message: "Email is required." }) };
            }

            const params = {
                ClientId: CLIENT_ID,
                Username: email,
                SecretHash: generateSecretHash(email)
            };

            await cognito.forgotPassword(params).promise();
            return { statusCode: 200, body: JSON.stringify({ message: "Verification code sent to email." }) };
        }
        // Confirm Password (Reset)
        else if (email && code && newPassword) {
            const params = {
                ClientId: CLIENT_ID,
                Username: email,
                ConfirmationCode: code,
                Password: newPassword,
                SecretHash: generateSecretHash(email)
            };

            await cognito.confirmForgotPassword(params).promise();
            return { statusCode: 200, body: JSON.stringify({ message: "Password reset successful." }) };
        }
        else {
            return { statusCode: 400, body: JSON.stringify({ message: "Invalid request parameters." }) };
        }

    } catch (error) {
        console.error("Error:", error);
        return { 
            statusCode: 400, 
            body: JSON.stringify({ 
                message: error.message,
                code: error.code 
            }) 
        };
    }
};