require('dotenv').config();
const express = require("express");
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const cookieParser = require('cookie-parser');

const app = express();

// AWS Cognito Configuration
const cognitoClient = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/new_attendance')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const Student = require("./models/student");
const Teacher = require("./models/teacher");
const Subject = require("./models/subject");
const Attendance = require("./models/attendance");
const Batch = require("./models/batch");

// JWT Verification Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.idToken || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).redirect('/login');
  }

  jwt.verify(
    token,
    (header, callback) => {
      cognitoClient.getSigningKey(header.kid, (err, key) => {
        callback(err, key.getPublicKey());
      });
    },
    { algorithms: ['RS256'] },
    (err, decoded) => {
      if (err) return res.status(403).redirect('/login');
      req.user = decoded;
      next();
    }
  );
};

// Auth Routes
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.render('login', { 
    title: 'Login - Attendance System',
    messages: req.query 
  });
});

app.get('/signup', (req, res) => {
  res.render('signup', { 
    title: 'Sign Up - Attendance System',
    messages: req.query 
  });
});

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { 
    title: 'Forgot Password',
    messages: req.query 
  });
});

// Protected Dashboard
app.get('/:role/dashboard', verifyToken, async (req, res) => {
  try {
    const role = req.params.role.toLowerCase();
    const userGroups = req.user['cognito:groups'] || [];

    if (!userGroups.includes(role.charAt(0).toUpperCase() + role.slice(1))) {
      return res.status(403).redirect('/login');
    }

    let userData;
    if (role === 'student') {
      userData = await Student.findOne({ email: req.user.email });
    } else if (role === 'teacher') {
      userData = await Teacher.findOne({ email: req.user.email });
    }

    res.render(`${role}-dashboard`, { 
      user: { ...req.user, ...userData?._doc },
      title: `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).redirect('/login');
  }
});

// Admin management routes
app.get('/manage/students', verifyToken, async (req, res) => {
  const students = await Student.find();
  res.render('manage-students', { title: 'Manage Students', students });
});

app.post('/manage/students', verifyToken, async (req, res) => {
  const { name, er_number, email, batch } = req.body;
  await Student.create({ name, er_number, email, batch });
  res.redirect('/manage/students');
});

app.get('/manage/teachers', verifyToken, async (req, res) => {
  const teachers = await Teacher.find();
  res.render('manage-teachers', { title: 'Manage Teachers', teachers });
});

app.post('/manage/teachers', verifyToken, async (req, res) => {
  const { name, email, position } = req.body;
  await Teacher.create({ name, email, position });
  res.redirect('/manage/teachers');
});

app.get('/manage/subjects', verifyToken, async (req, res) => {
  const subjects = await Subject.find();
  res.render('manage-subjects', { title: 'Manage Subjects', subjects });
});

app.post('/manage/subjects', verifyToken, async (req, res) => {
  const { name, code, type } = req.body;
  await Subject.create({ name, code, type });
  res.redirect('/manage/subjects');
});

app.get('/manage/batches', verifyToken, async (req, res) => {
  const batches = await Batch.find();
  res.render('manage-batches', { title: 'Manage Batches', batches });
});

app.post('/manage/batches', verifyToken, async (req, res) => {
  const { name, year } = req.body;
  await Batch.create({ name, year });
  res.redirect('/manage/batches');
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('idToken');
  res.redirect('/login');
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Error',
    message: err.message 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
