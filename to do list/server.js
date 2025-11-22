const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const cors = require('cors');
const XLSX = require('xlsx');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/todoApp', { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  phone: String,
  password: String,
  otp: String,
  otpExpiry: Date
});
const User = mongoose.model('User', userSchema);

// Task Schema
const taskSchema = new mongoose.Schema({
  userId: String,
  title: String,
  completed: Boolean
});
const Task = mongoose.model('Task', taskSchema);

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Register
app.post('/register', async (req, res) => {
  const { email, phone, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ email, phone, password: hashed });
  await user.save();
  res.send("User registered");
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("User not found");
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).send("Invalid password");
  const token = jwt.sign({ id: user._id }, "SECRET");
  res.json({ token });
});

// Forgot Password (send OTP)
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("User not found");

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 min
  await user.save();

  // Send OTP via email
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'yourEmail@gmail.com', pass: 'yourPassword' }
  });
  await transporter.sendMail({
    from: 'yourEmail@gmail.com',
    to: email,
    subject: 'Password Reset OTP',
    text: `Your OTP is ${otp}`
  });

  res.send("OTP sent");
});

// Verify OTP & Reset Password
app.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.otp !== otp || Date.now() > user.otpExpiry) {
    return res.status(400).send("Invalid or expired OTP");
  }
  user.password = await bcrypt.hash(newPassword, 10);
  user.otp = null;
  await user.save();
  res.send("Password reset successful");
});

// CRUD for Tasks
app.post('/tasks', async (req, res) => {
  const { userId, title } = req.body;
  const task = new Task({ userId, title, completed: false });
  await task.save();
  res.json(task);
});

app.get('/tasks/:userId', async (req, res) => {
  const tasks = await Task.find({ userId: req.params.userId });
  res.json(tasks);
});

app.put('/tasks/:id', async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(task);
});

app.delete('/tasks/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.send("Task deleted");
});

// Export tasks to Excel
app.get('/export/:userId', async (req, res) => {
  const tasks = await Task.find({ userId: req.params.userId });
  const data = tasks.map(t => ({ Title: t.title, Completed: t.completed }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tasks");
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="tasks.xlsx"');
  res.send(buffer);
});

app.listen(4000, () => console.log("Server running on port 4000"));