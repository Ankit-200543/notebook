const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const OTP = require('../models/otp.model');
const authMiddleware = require("../util/authMiddleware");
const sendEmail = require('../util/sendEmail');

// 1. Send OTP to Email
router.post('/sendOTP', async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to DB (upsert)
        await OTP.findOneAndUpdate(
            { email },
            { otp, isVerified: false, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        // Send Email
        const emailSent = await sendEmail(email, otp);

        if (emailSent) {
            res.status(200).json({ success: true, message: 'OTP sent to email' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send OTP' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    try {
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }
        otpRecord.isVerified = true;
        await otpRecord.save();

        res.status(200).json({ success: true, message: 'OTP verified successfully. You can now proceed to signup.' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

// 3. Signup (Checks if email was verified)
router.post('/signup', async (req, res) => {
    const { username, email, password, age } = req.body;
    try {
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Check if OTP was verified for this email
        const otpRecord = await OTP.findOne({ email, isVerified: true });
        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'Email not verified. Please verify OTP first.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User
        const newUser = await User.create({
            username, email, password: hashedPassword, age
        });

        // Cleanup: Delete OTP record after successful signup
        await OTP.deleteOne({ email });

        // Generate Token
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email },
            process.env.JWT_SECRET
        );

        res.cookie('token', token);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: newUser._id
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

router.post('/createUser', async (req, res) => {
    const { username, email, password, age } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username, email, password: hashedPassword, age
        });

        const token = jwt.sign(
            { email: newUser.email },
            process.env.JWT_SECRET
        );

        res.cookie('token', token);

        res.status(201).json({
            success: true,
            message: 'New User Created',
            userId: newUser._id
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userPresent = await User.findOne({ email });
        if (!userPresent) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, userPresent.password);

        if (isMatch) {
            const token = jwt.sign(
                { id: userPresent._id, email: userPresent.email },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 3600000
            });

            return res.status(200).json({ success: true, message: "Logged in successfully" });
        } else {
            return res.status(401).json({ success: false, message: "Wrong Password" });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});
router.post('/logout', (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        maxAge: 0,                  // Clear cookie immediately
        secure: true,                // Required if using sameSite: 'None'
        sameSite: 'None',            // Must match the sameSite used when setting the cookie
    });

    return res.status(200).json({ success: true, message: "Logged out successfully" });
});

router.get('/loggedIn', authMiddleware, async (req, res) => {
    try {
        const UserData = await User.findOne({
            email: req.user.email
        }).select('username email age');

        res.status(200).json({
            success: true,
            data: UserData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

module.exports = router;