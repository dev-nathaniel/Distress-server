import { Router } from "express";
import Distress from "../models/Distress.js"; // Corrected to use the Distress model
import { verifyTokenAndRole } from './users.js'; // Reusing the middleware for authentication
import { client } from "../../index.js";
import User from "../models/User.js";

const router = Router();

// Create a new distress alert
router.post('/', verifyTokenAndRole(), async (request, response) => {
    try {
        const distressAlert = new Distress({
            user: request.userId,
            location: [request.body.location], // Wrap the location object in an array
            message: request.body.message,
            additionalDetails: [request.body.additionalDetails] // Wrap the object in an array
        });
        const newAlert = await distressAlert.save();
        const { batteryLevel, phoneStatus, timeAdded } = distressAlert.additionalDetails[0];
    // {"coords": {"accuracy": 5, "altitude": 79.51784883765079, "altitudeAccuracy": 30, "heading": -1, "latitude": 52.6296181498343, "longitude": -1.1209546978503624, "speed": -1}, "timestamp": 1747147173648.2593}
    // try {
        const latestLocation = distressAlert.location[0]; // Access the latest location
        // 10:32 AM, Aug 25, 2024
                // body: `Emergency! Battery level: ${batteryLevel}, Location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`,
                

        // Fetch the user to get emergency contacts
        const user = await User.findById(request.userId);
        if (!user) {
            return response.status(404).json({ message: "User not found" });
        }

        // Send messages to all emergency contacts
        const sendMessages = user.emergencyContacts.map(contact => {
            return client.messages.create({
                body: `🔴 Distress Signal Sent by your contact ${user.fullName}
📍 Current Location: https://maps.google.com/?q=${latestLocation.coords.latitude},${latestLocation.coords.longitude}🗺️
🔗 Additional Details:
Time Sent: ${distressAlert.additionalDetails[0].timeAdded.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric', year: 'numeric' })}
Battery Level: ${Number(distressAlert.additionalDetails[0].batteryLevel).toFixed(0)}%
Phone Status: Silent Mode
If you are nearby or can assist, please contact her or the authorities immediately! 🚑🚓
Stay safe and act quickly.
Escalate distress to admin: `,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: contact.phoneNumbers[0].digits // Assuming the first phone number is the primary contact
            });
        });

        // Wait for all messages to be sent
        await Promise.all(sendMessages);

        response.status(201).json(newAlert);
    } catch (error) {
        console.error(error);
        response.status(400).json({ message: error.message });
    }
});

// Get all distress alerts (admin only)
router.get('/', verifyTokenAndRole('admin'), async (request, response) => {
    try {
        const alerts = await Distress.find().populate('user');
        response.json(alerts);
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Get distress alerts by user (admin or the user themselves)
router.get('/user/:userId', verifyTokenAndRole(), async (request, response) => {
    try {
        if (request.userRole !== 'admin' && request.userId !== request.params.userId) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }
        const alerts = await Distress.find({ user: request.params.userId });
        response.json(alerts);
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Get a specific distress alert by ID (admin or the user who created it)
router.get('/:id', verifyTokenAndRole(), async (request, response) => {
    try {
        const alert = await Distress.findById(request.params.id);
        if (!alert) return response.status(404).json({ message: "Distress alert not found" });

        if (request.userRole !== 'admin' && alert.user.toString() !== request.userId) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }

        response.json(alert);
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Update a distress alert (admin or the user who created it)
router.put('/:id', verifyTokenAndRole(), async (request, response) => {
    try {
        const alert = await Distress.findById(request.params.id);
        if (!alert) return response.status(404).json({ message: "Distress alert not found" });

        if (request.userRole !== 'admin' && alert.user.toString() !== request.userId) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }

        if (request.body.location != null) {
            alert.location.unshift(...request.body.location); // Prepend to the existing array
        }
        if (request.body.message != null) {
            alert.message = request.body.message;
        }
        if (request.body.escalated != null) {
            alert.escalated = request.body.escalated;
        }
        if (request.body.droneDeployed != null) {
            alert.droneDeployed = request.body.droneDeployed;
        }
        if (request.body.resolved != null) {
            alert.resolved = request.body.resolved;
        }
        if (request.body.additionalDetails != null) {
            alert.additionalDetails.unshift(...request.body.additionalDetails); // Prepend to the existing array
        }

        const updatedAlert = await alert.save();
        response.json(updatedAlert);
    } catch (error) {
        response.status(400).json({ message: error.message });
    }
});

// Delete a distress alert (admin or the user who created it)
router.delete('/:id', verifyTokenAndRole(), async (request, response) => {
    try {
        const alert = await Distress.findById(request.params.id);
        if (!alert) return response.status(404).json({ message: "Distress alert not found" });

        if (request.userRole !== 'admin' && alert.user.toString() !== request.userId) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }

        await alert.remove();
        response.json({ message: "Distress alert deleted" });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Escalate a distress alert by email or phone number
router.post('/escalate/:id', async (request, response) => {
    try {
        const { email, phoneNumber } = request.body;
        const alert = await Distress.findById(request.params.id)

        if (!alert) return response.status(404).json({ message: "Distress alert not found" });

        alert.escalated.status = true;
        if (email) {
            alert.escalated.by.email = email;
        } 
        if (phoneNumber) {
            alert.escalated.by.phoneNumber = phoneNumber;
        }
        const updatedAlert = await alert.save();
        response.json(updatedAlert);
    } catch (error) {
        response.status(400).json({ message: error.message });
    }
});

export default router;
