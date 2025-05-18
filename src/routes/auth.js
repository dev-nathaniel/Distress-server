import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

// Helper function to get JWT secret
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT secret is not defined in environment variables");
    }
    return secret;
};

// User login
router.post('/login', async (request, response) => {
    try {
        const { email, password } = request.body;
        const user = await User.findOne({ email });
        if (!user) {
            return response.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return response.status(401).json({ message: "Invalid password" });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '3h' });
        response.json({ token });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Admin login
router.post('/admin/login', async (request, response) => {
    try {
        const { email, password } = request.body;
        const user = await User.findOne({ email });
        if (!user) {
            return response.status(404).json({ message: "User not found" });
        }

        if (user.role !== 'admin') {
            return response.status(403).json({ message: "Access denied. This is an admin-only feature." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return response.status(401).json({ message: "Invalid password" });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '3h' });
        response.json({ token });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// User registration
router.post('/register', async (request, response) => {
    try {
        const { fullName, email, password, phoneNumber, homeAddress, role } = request.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return response.status(400).json({ message: "Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            fullName,
            email,
            password: hashedPassword,
            phoneNumber,
            homeAddress,
            role: role || 'user'
        });

        const newUser = await user.save();
        const token = jwt.sign({ id: newUser._id, role: newUser.role }, getJwtSecret(), { expiresIn: '1h' });
        const {password: userPassword, __v, updatedAt, ...restOfUser} = newUser._doc
        response.status(201).json({ user: restOfUser, token });
    } catch (error) {
        response.status(400).json({ message: error.message });
    }
});

// Endpoint to confirm if token is still valid
router.get('/token/validate', async (request, response) => {
    try {
        const token = request.headers['authorization'].split(' ')[1];
        if (!token) {
            return response.status(401).json({ message: "No token provided" });
        }

        jwt.verify(token, getJwtSecret(), (error, decoded) => {
            if (error) {
                return response.status(401).json({ message: "Invalid token" });
            }
            response.json({ message: "Token is valid", decoded });
        });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Endpoint to refresh token with no expiry time
router.post('/token/refresh', async (request, response) => {
    try {
        const { token } = request.body;
        if (!token) {
            return response.status(401).json({ message: "No token provided" });
        }

        jwt.verify(token, getJwtSecret(), (error, decoded) => {
            if (error) {
                return response.status(401).json({ message: "Invalid token" });
            }

            const newToken = jwt.sign({ id: decoded.id, role: decoded.role }, getJwtSecret());
            response.json({ token: newToken });
        });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

export default router;
