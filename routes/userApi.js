const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); 
const authMiddleware = require("../util/authMiddleware");

router.post('/createUser', async (req, res) => {
    const { username, email, password, age } = req.body; 
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username, email, password: hashedPassword, age
        });

        const token = jwt.sign(
            {email: newUser.email},
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
      
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',  
            maxAge: 3600000 
        });

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