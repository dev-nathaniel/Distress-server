import { Router } from "express";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; // Importing jsonwebtoken for token handling

const router = Router();

// Middleware to verify JWT token and user role
// Can be configured to require specific roles (admin, user, etc.)
export const verifyTokenAndRole = (requiredRole) => (request, response, next) => {
    const authToken = request.headers['authorization']
    // [TRIAL AND ERROR] - Debug logging
    // console.log(token)
    if (!authToken) return response.status(403).json({ message: "No token provided" });
    const token = authToken.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
        console.log(error)
        if (error) return response.status(500).json({ message: "Failed to authenticate token" });
        request.userId = decoded.id;
        // [TRIAL AND ERROR] - Debug logging
        // console.log(decoded.id, 'decoded')
        // console.log(request.userId, 'request')
        request.userRole = decoded.role;
        if (requiredRole && request.userRole !== requiredRole) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }
        next();
    });
};

// Get all users (admin only)
// GET /
// Requires admin authentication
router.get('/', verifyTokenAndRole('admin'), async (request, response) => {
    try {
        const users = await User.find();
        response.json(users);
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Get users with a specific role (admin only)
// GET /role/:role
// Requires admin authentication
router.get('/role/:role', verifyTokenAndRole('admin'), async (request, response) => {
    try {
        const users = await User.find({ role: request.params.role });
        if (users.length === 0) return response.status(404).json({ message: "No users found with this role" });
        response.json(users);
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Get a specific user by ID
// GET /:id
// Requires authentication (admin or the user themselves)
router.get('/:id', verifyTokenAndRole(), async (request, response) => {
    try {
        if (request.userRole !== 'admin' && request.userId !== request.params.id) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }
        const user = await User.findById(request.params.id);
        if (!user) return response.status(404).json({ message: "User not found" });
        response.json(user);
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Check if a user has emergency contacts
// GET /:id/emergencyContacts
// Requires authentication (admin or the user themselves)
router.get('/:id/emergencyContacts', verifyTokenAndRole(), async (request, response) => {
    try {
        const user = await User.findById(request.params.id);
        if (!user) return response.status(404).json({ message: "User not found" });
        if (user.emergencyContacts && user.emergencyContacts.length > 0) {
            response.json({ hasEmergencyContacts: true });
            console.log(user.emergencyContacts)
        } else {
            response.json({ hasEmergencyContacts: false });
            console.log(user.emergencyContacts)
        }
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Create a new user
// POST /
// Required body: { fullName, email, password, phoneNumber, homeAddress, emergencyContacts?, role? }
router.post('/', async (request, response) => {
    try {
        // Hash password with bcrypt (10 rounds)
        const hashedPassword = await bcrypt.hash(request.body.password, 10);
        const user = new User({
            fullName: request.body.fullName,
            email: request.body.email,
            password: hashedPassword,
            phoneNumber: request.body.phoneNumber,
            homeAddress: request.body.homeAddress,
            emergencyContacts: request.body.emergencyContacts,
            role: request.body.role || 'user' // Default to 'user' if not provided
        });
        const newUser = await user.save();
        // Generate JWT token with 1-hour expiry
        const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        response.status(201).json({ newUser, token });
    } catch (error) {
        response.status(400).json({ message: error.message });
    }
});

// Update a user
// PUT /:id
// Requires authentication (admin or the user themselves)
router.put('/:id', verifyTokenAndRole(), async (request, response) => {
    try {
        // [TRIAL AND ERROR] - Debug logging
        // console.log(request.userId)
        if (request.userRole !== 'admin' && request.userId !== request.params.id) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }
        const user = await User.findById(request.params.id);
        if (!user) return response.status(404).json({ message: "User not found" });

        // Update fields if provided in request
        if (request.body.fullName != null) {
            user.fullName = request.body.fullName;
        }
        if (request.body.email != null) {
            user.email = request.body.email;
        }
        if (request.body.password != null) {
            user.password = await bcrypt.hash(request.body.password, 10);
        }
        if (request.body.phoneNumber != null) {
            user.phoneNumber = request.body.phoneNumber;
        }
        if (request.body.homeAddress != null) {
            user.homeAddress = request.body.homeAddress;
        }
        if (request.body.emergencyContacts != null) {
            // Validate emergency contact data
            user.emergencyContacts = request.body.emergencyContacts.map(contact => {
                if (!contact.name && !contact.firstName && !contact.lastName) {
                    return response.status(400).json({ message: "At least one of name, firstName, or lastName must be present for each emergency contact" });
                }
                contact.phoneNumbers.forEach(phone => {
                    if (!phone.digits && !phone.number) {
                        return response.status(400).json({ message: "At least one of digits or number must be present for each phone number" });
                    }
                });
                return contact;
            });
        }
        // Only admin can update user role
        if (request.body.role != null && request.userRole === 'admin') {
            user.role = request.body.role;
        }

        const updatedUser = await user.save();
        response.json(updatedUser);
    } catch (error) {
        response.status(400).json({ message: error.message });
    }
});

// Delete a user (admin only)
// DELETE /:id
// Requires admin authentication
router.delete('/:id', verifyTokenAndRole('admin'), async (request, response) => {
    try {
        const user = await User.findById(request.params.id);
        if (!user) return response.status(404).json({ message: "User not found" });

        await user.remove();
        response.json({ message: "User deleted" });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

export default router;