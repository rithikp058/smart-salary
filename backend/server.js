require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employee');
const salaryRoutes = require('./routes/salary');
const attendanceRoutes = require('./routes/attendance');
const ownerRoutes = require('./routes/owner');
const issueRoutes = require('./routes/issues');
const holidayRoutes = require('./routes/holidays');
const leaveRoutes = require('./routes/leaves');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/leaves', leaveRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart_salary';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    app.listen(PORT, () => console.log(`Server running on port ${PORT} (no DB)`));
  });
