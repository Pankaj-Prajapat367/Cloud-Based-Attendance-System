const AWS = require('aws-sdk');
const crypto = require('crypto');

const cognito = new AWS.CognitoIdentityServiceProvider({ region: 'ap-south-1' });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const CLIENT_ID = '6dd3p6pudipgc6lnshepcqt4ih';
const CLIENT_SECRET = 'ltj68lm7h7o847m1978gcg9f7q5l0orab89rfjg88qfedn14ir3';
const USER_POOL_ID = 'ap-south-1_2KWzGnJy1';

function generateSecretHash(username) {
    return crypto.createHmac('sha256', CLIENT_SECRET)
        .update(username + CLIENT_ID)
        .digest('base64');
}

exports.handler = async (event) => {
    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ message: "Request body is missing" }) };
        }

        const { email, password, name, role, studentId, teacherId } = JSON.parse(event.body);

        // Validate required fields
        if (!email || !password || !name || !role) {
            return { statusCode: 400, body: JSON.stringify({ message: "Missing required fields" }) };
        }

        if (role === 'student' && !studentId) {
            return { statusCode: 400, body: JSON.stringify({ message: "Student ID is required" }) };
        }

        if (role === 'teacher' && !teacherId) {
            return { statusCode: 400, body: JSON.stringify({ message: "Teacher ID is required" }) };
        }

        // 1. Sign up the user
        const signUpParams = {
            ClientId: CLIENT_ID,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'name', Value: name },
                { Name: 'custom:role', Value: role },
                ...(role === 'student' ? [{ Name: 'custom:studentId', Value: studentId }] : []),
                ...(role === 'teacher' ? [{ Name: 'custom:teacherId', Value: teacherId }] : [])
            ],
            SecretHash: generateSecretHash(email)
        };

        await cognito.signUp(signUpParams).promise();

        // 2. Auto-confirm the user
        await cognito.adminConfirmSignUp({
            UserPoolId: USER_POOL_ID,
            Username: email
        }).promise();

        // 3. Verify email
        await cognito.adminUpdateUserAttributes({
            UserPoolId: USER_POOL_ID,
            Username: email,
            UserAttributes: [
                { Name: 'email_verified', Value: 'true' }
            ]
        }).promise();

        // 4. Add user to their respective group (with correct case)
        const groupName = role.charAt(0).toUpperCase() + role.slice(1); // "student" → "Student"
        await cognito.adminAddUserToGroup({
            UserPoolId: USER_POOL_ID,
            Username: email,
            GroupName: groupName
        }).promise();

        // 5. Store in DynamoDB
        const dbParams = {
            TableName: role === 'student' ? 'AttendanceRecords' : 'Teachers',
            Item: {
                [role === 'student' ? 'studentId' : 'teacherId']: role === 'student' ? studentId : teacherId,
                name,
                email,
                ...(role === 'teacher' ? { classes: [] } : { courses: [] })
            }
        };

        await dynamoDB.put(dbParams).promise();

        return { 
            statusCode: 200, 
            body: JSON.stringify({ 
                message: 'Signup successful',
                userId: role === 'student' ? studentId : teacherId,
                role
            }) 
        };

    } catch (error) {
        console.error("Signup Error:", error);
        
        let errorMessage = error.message;
        if (error.code === 'UsernameExistsException') {
            errorMessage = "User already exists with this email";
        } else if (error.code === 'InvalidParameterException') {
            errorMessage = "Invalid user attributes provided";
        } else if (error.code === 'ResourceNotFoundException') {
            errorMessage = "User group does not exist - contact administrator";
        }

        return { 
            statusCode: 400, 
            body: JSON.stringify({ 
                message: errorMessage,
                code: error.code 
            }) 
        };
    }
};