import { Router } from "express";
import Distress from "../models/Distress.js";
import { verifyTokenAndRole } from './users.js'; // Reusing the middleware for authentication
import { client } from "../../index.js";
import User from "../models/User.js";
import axios from "axios";
import { sendEmail } from "../utils/sendEmail.js";

const router = Router();

// Create a new distress alert
// POST /
// Required body: { location, message, additionalDetails }
// Requires authentication
router.post('/', verifyTokenAndRole(), async (request, response) => {
    try {
        // Create new distress alert with user ID and provided details
        const distressAlert = new Distress({
            user: request.userId,
            location: [request.body.location], // Wrap the location object in an array
            message: request.body.message,
            additionalDetails: [request.body.additionalDetails] // Wrap the object in an array
        });
        const newAlert = await distressAlert.save();
        
        // [TRIAL AND ERROR] - Commented out destructuring of additional details
        // const { batteryLevel, phoneStatus, timeAdded } = distressAlert.additionalDetails[0];

        // Get the latest location from the alert
        const latestLocation = distressAlert.location[0];

        // Fetch user details to access emergency contacts
        const user = await User.findById(request.userId);
        if (!user) {
            return response.status(404).json({ message: "User not found" });
        }

        // [TRIAL AND ERROR] - URL shortening service integration
        // const shortenedUrl = await axios.post('https://spoo.me', {url: '', alias: '', password: ''})

        // Send SMS notifications to all emergency contacts
//         const sendMessages = user.emergencyContacts.map(contact => {
//             return client.messages.create({
//                 body: `🔴 Distress Signal Sent by your contact ${user.fullName}
// 📍 Current Location: https://maps.google.com/?q=${latestLocation.coords.latitude},${latestLocation.coords.longitude}🗺️
// 🔗 Additional Details:
// Time Sent: ${distressAlert.additionalDetails[0].timeAdded.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric', year: 'numeric' })}
// Battery Level: ${Number(distressAlert.additionalDetails[0].batteryLevel).toFixed(0)}%
// If you are nearby or can assist, please contact her or the authorities immediately! 🚑🚓
// Stay safe and act quickly.
// Escalate distress to admin: https://distress.netlify.app?id=${distressAlert._id}`,
//                 from: process.env.TWILIO_PHONE_NUMBER,
//                 to: contact.phoneNumbers[0].digits ?? contact.phoneNumbers[0].number // Use digits if available, fallback to full number
//             });
//         });
        // Send email notifications to all emergency contacts
        // const sendEmails = user.emergencyContacts.map(contact => {
            await sendEmail({
                from: "adebayoolowofoyeku@gmail.com",
                to: "adebayoolowofoyeku@gmail.com", // Assumes each contact has an email field
                subject: "Distress Alert Notification",
                html: `
                <div style="background: #f4f8fb; padding: 40px 0;">
                    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(69,155,251,0.08); overflow: hidden;">
                    <tr>
                        <td style="background: #e4571b; padding: 24px 0; text-align: center;">
                        <h1 style="color: #fff; margin: 0; font-family: Arial, sans-serif; font-size: 28px; letter-spacing: 1px;">Distress Alert</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 32px 24px 32px; font-family: Arial, sans-serif; color: #222;">
                        <h2 style="color: #e4571b; margin-top: 0; font-size: 22px;">Distress Signal Sent by ${user.fullName}</h2>
                        <p style="font-size: 16px; color: #444;">
                            <b>Location:</b> <a href="https://maps.google.com/?q=${latestLocation.coords.latitude},${latestLocation.coords.longitude}">View on Map</a><br>
                            <b>Message:</b> ${distressAlert.message}<br>
                            <b>Time Sent:</b> ${distressAlert.additionalDetails[0].timeAdded.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric', year: 'numeric' })}<br>
                            <b>Battery Level:</b> ${Number(distressAlert.additionalDetails[0].batteryLevel).toFixed(0)}%
                        </p>
                        <p style="font-size: 15px; color: #888;">
                            If you are nearby or can assist, please contact them or the authorities immediately!<br>
                            Escalate distress to admin: <a href="https://distress.netlify.app?id=${distressAlert._id}">Escalate Now</a>
                        </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: #f4f8fb; text-align: center; padding: 16px 0; font-size: 13px; color: #aaa;">
                        &copy; ${new Date().getFullYear()} Distress App. All rights reserved.
                        </td>
                    </tr>
                    </table>
                </div>
                `,
            });
        // });
        // await Promise.all(sendEmails);

        // Wait for all SMS messages to be sent
        // await Promise.all(sendMessages);

        response.status(201).json(newAlert);
    } catch (error) {
        console.error(error);
        response.status(400).json({ message: error.message });
    }
});

// Get all distress alerts (admin only)
// GET /
// Requires admin authentication
router.get('/', verifyTokenAndRole('admin'), async (request, response) => {
    try {
        const alerts = await Distress.find().populate('user').sort({ createdAt: -1 });
        response.json(alerts);
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Get distress alerts by user ID
// GET /user/:userId
// Requires authentication (admin or the user themselves)
router.get('/user/:userId', verifyTokenAndRole(), async (request, response) => {
    try {
        // Check if user has permission to view these alerts
        if (request.userRole !== 'admin' && request.userId !== request.params.userId) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }
        const alerts = await Distress.find({ user: request.params.userId });
        response.json(alerts);
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Get a specific distress alert by ID
// GET /:id
// Requires authentication (admin or the user who created it)
router.get('/:id', verifyTokenAndRole(), async (request, response) => {
    try {
        const alert = await Distress.findById(request.params.id);
        if (!alert) return response.status(404).json({ message: "Distress alert not found" });

        // Check if user has permission to view this alert
        if (request.userRole !== 'admin' && alert.user.toString() !== request.userId) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }

        response.json(alert);
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Update a distress alert
// PUT /:id
// Requires authentication (admin or the user who created it)
router.put('/:id', verifyTokenAndRole(), async (request, response) => {
    try {
        const alert = await Distress.findById(request.params.id);
        if (!alert) return response.status(404).json({ message: "Distress alert not found" });

        // Check if user has permission to update this alert
        if (request.userRole !== 'admin' && alert.user.toString() !== request.userId) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }

        // Update fields if provided in request
        if (request.body.location != null) {
            alert.location.unshift(...request.body.location); // Add new location to start of array
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
            alert.additionalDetails.unshift(...request.body.additionalDetails); // Add new details to start of array
        }

        const updatedAlert = await alert.save();
        response.json(updatedAlert);
    } catch (error) {
        response.status(400).json({ message: error.message });
    }
});

// Delete a distress alert
// DELETE /:id
// Requires authentication (admin or the user who created it)
router.delete('/:id', verifyTokenAndRole(), async (request, response) => {
    try {
        const alert = await Distress.findById(request.params.id);
        if (!alert) return response.status(404).json({ message: "Distress alert not found" });

        // Check if user has permission to delete this alert
        if (request.userRole !== 'admin' && alert.user.toString() !== request.userId) {
            return response.status(403).json({ message: "Insufficient permissions" });
        }

        await alert.remove();
        response.json({ message: "Distress alert deleted" });
    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// Escalate a distress alert
// POST /escalate/:id
// Required body: { email?, phoneNumber?, additionalInfo? }
router.post('/escalate/:id', async (request, response) => {
    try {
        const { email, phoneNumber } = request.body;
        console.log(email, 'email')
        console.log(phoneNumber, 'phone')
        const alert = await Distress.findById(request.params.id)

        if (!alert) return response.status(404).json({ message: "Distress alert not found" });

        // Check if the distress alert has already been escalated
        if (alert.escalated.status) {
            return response.status(404).json({ message: "Distress alert has already been escalated" });
        }

        // Prepare escalation details
        const by = {
            email,
            phoneNumber
        }
        alert.escalated.status = true;
        
        // Update escalation contact details
        if (email) {
            by.email = email;
        } 
        if (phoneNumber) {
            by.phoneNumber = phoneNumber;
        }

        alert.escalated.by = by
        // Add any additional information provided
        if (request.body.additionalInfo) {
            alert.escalated.additionalInfo = request.body.additionalInfo;
        }
        
        const updatedAlert = await alert.save();
        response.json(updatedAlert);
    } catch (error) {
        console.log(error, 'escalation error')
        console.log(error.message)
        response.status(400).json({ message: error.message });
    }
});

export default router;
