const AWS = require('aws-sdk');
const crypto = require('crypto');

AWS.config.update({ region: 'ap-south-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();

const CLIENT_ID = process.env.CLIENT_ID || '6dd3p6pudipgc6lnshepcqt4ih';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const USER_POOL_ID = process.env.USER_POOL_ID || 'ap-south-1_2KWzGnJy1';

function generateSecretHash(username) {
    if (!CLIENT_SECRET) throw new Error("Missing CLIENT_SECRET");
    return crypto.createHmac('sha256', CLIENT_SECRET)
        .update(username + CLIENT_ID)
        .digest('base64');
}

function extractAttributes(userAttributes) {
    return userAttributes.reduce((acc, attr) => {
        if (attr.Name.startsWith('custom:')) {
            acc[attr.Name.replace('custom:', '')] = attr.Value;
        } else {
            acc[attr.Name] = attr.Value;
        }
        return acc;
    }, {});
}

exports.handler = async (event) => {
    console.log("📥 Received event:", JSON.stringify(event, null, 2));

    try {
        const { email, password, newPassword, role } = JSON.parse(event.body);
        
        // Validate input
        if (!email || !password) {
            return { statusCode: 400, body: JSON.stringify({ error: "Email and password are required" }) };
        }

        // Step 1: Authenticate User
        const authParams = {
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            UserPoolId: USER_POOL_ID,
            ClientId: CLIENT_ID,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
                SECRET_HASH: generateSecretHash(email)
            }
        };

        const authResult = await cognito.adminInitiateAuth(authParams).promise();

        // Handle password change if required
        if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            if (!newPassword) {
                return { 
                    statusCode: 400, 
                    body: JSON.stringify({ 
                        message: "New password required",
                        requiresPasswordChange: true 
                    }) 
                };
            }
            
            await cognito.adminRespondToAuthChallenge({
                ChallengeName: 'NEW_PASSWORD_REQUIRED',
                ClientId: CLIENT_ID,
                UserPoolId: USER_POOL_ID,
                ChallengeResponses: {
                    USERNAME: email,
                    NEW_PASSWORD: newPassword,
                    SECRET_HASH: generateSecretHash(email)
                },
                Session: authResult.Session
            }).promise();
            
            return { 
                statusCode: 200, 
                body: JSON.stringify({ 
                    message: "Password updated successfully. Please login again." 
                }) 
            };
        }

        if (!authResult.AuthenticationResult) {
            throw new Error("Authentication failed");
        }

        // Step 2: Get User Details and Verify Role
        const userInfo = await cognito.adminGetUser({
            UserPoolId: USER_POOL_ID,
            Username: email
        }).promise();

        const attributes = extractAttributes(userInfo.UserAttributes);
        const userRole = attributes.role || 'student'; // Default to student if role not set

        // Verify requested role matches actual role
        if (role && role !== userRole) {
            throw new Error(`User is not a ${role}`);
        }

        // Step 3: Return Response (No DynamoDB lookup)
        return {
            statusCode: 200,
            body: JSON.stringify({
                AuthenticationResult: {
                    AccessToken: authResult.AuthenticationResult.AccessToken,
                    IdToken: authResult.AuthenticationResult.IdToken,
                    RefreshToken: authResult.AuthenticationResult.RefreshToken
                },
                role: userRole,
                userId: email, // Using email as userId since we're not querying DynamoDB
                name: attributes.name || email.split('@')[0], // Fallback to email prefix if name not available
                email: email,
                // No role-specific data since we're not using DynamoDB
            })
        };

    } catch (error) {
        console.error("❌ Error:", error);
        return { 
            statusCode: 400, 
            body: JSON.stringify({ 
                error: error.message,
                code: error.code 
            }) 
        };
    }
};