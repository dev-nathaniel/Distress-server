import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

// Helper function to get JWT secret from environment variables
// Throws an error if JWT_SECRET is not configured
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT secret is not defined in environment variables");
    }
    return secret;
};

// Regular user login endpoint
// POST /login
// Required body: { email, password }
router.post('/login', async (request, response) => {
    try {
        const { email, password } = request.body;
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return response.status(404).json({ message: "User not found" });
        }

        // Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return response.status(401).json({ message: "Invalid password" });
        }

        // Generate JWT token with 3-hour expiry
        const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '3h' });
        response.json({ id: user._id, token });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Admin-specific login endpoint
// POST /admin/login
// Required body: { email, password }
router.post('/admin/login', async (request, response) => {
    try {
        const { email, password } = request.body;
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return response.status(404).json({ message: "User not found" });
        }

        // Verify admin role
        if (user.role !== 'admin') {
            return response.status(403).json({ message: "Access denied. This is an admin-only feature." });
        }

        // Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return response.status(401).json({ message: "Invalid password" });
        }

        // Generate JWT token with 3-hour expiry
        const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '3h' });
        response.json({ token });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// User registration endpoint
// POST /register
// Required body: { fullName, email, password, phoneNumber, homeAddress, role? }
router.post('/register', async (request, response) => {
    try {
        const { fullName, email, password, phoneNumber, homeAddress, role } = request.body;
        // Check if email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return response.status(400).json({ message: "Email already in use" });
        }

        // Hash password with bcrypt (10 rounds)
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            fullName,
            email,
            password: hashedPassword,
            phoneNumber,
            homeAddress,
            role: role || 'user'  // Default to 'user' role if not specified
        });

        // Save new user and generate token
        const newUser = await user.save();
        const token = jwt.sign({ id: newUser._id, role: newUser.role }, getJwtSecret(), { expiresIn: '1h' });
        // Remove sensitive data from response
        const {password: userPassword, __v, updatedAt, ...restOfUser} = newUser._doc
        response.status(201).json({ id: newUser._id, token });
    } catch (error) {
        response.status(400).json({ message: error.message });
    }
});

// Token validation endpoint
// GET /token/validate
// Required header: Authorization: Bearer <token>
router.get('/token/validate', async (request, response) => {
    try {
        // Extract token from Authorization header
        const token = request.headers['authorization'].split(' ')[1];
        if (!token) {
            return response.status(401).json({ message: "No token provided" });
        }

        // Verify token and return decoded payload if valid
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

// Token refresh endpoint
// POST /token/refresh
// Required body: { token }
router.post('/token/refresh', async (request, response) => {
    try {
        const { token } = request.body;
        if (!token) {
            return response.status(401).json({ message: "No token provided" });
        }

        // Verify existing token and generate new one without expiry
        jwt.verify(token, getJwtSecret(), (error, decoded) => {
            if (error) {
                return response.status(401).json({ message: "Invalid token" });
            }

            // Generate new token with same payload but no expiry
            const newToken = jwt.sign({ id: decoded.id, role: decoded.role }, getJwtSecret());
            response.json({ token: newToken });
        });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

export default router;
