import mongoose from "mongoose";

// Schema definition for Distress signals/alerts
const distressSchema = new mongoose.Schema({
    // Reference to the user who created the distress signal
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The distress message or description
    message: {
        type: String,
        required: true
    },
    // Location tracking data with detailed coordinates
    location: {
        type: [{
            coords: {
                accuracy: { type: Number, required: true },      // GPS accuracy in meters
                altitude: { type: Number, required: true },      // Height above sea level
                altitudeAccuracy: { type: Number, required: true }, // Accuracy of altitude measurement
                heading: { type: Number, required: true },       // Direction of movement in degrees
                latitude: { type: Number, required: true },      // Latitude coordinate
                longitude: { type: Number, required: true },     // Longitude coordinate
                speed: { type: Number, required: true }          // Speed in meters per second
            },
            timestamp: { type: Number, required: true }         // When the location was recorded
        }],
        required: true
    },
    // Information about escalation of the distress signal
    escalated: {
        status: { type: Boolean, default: false },          // Whether the case has been escalated
        by: {
            email: { type: String },                    // Email of person who escalated
            phoneNumber: { type: String }               // Phone of person who escalated
        },
        additionalInfo: { type: String, default: '' }   // Any extra information about escalation
    },
    // Flag indicating if a drone has been deployed
    droneDeployed: {
        type: Boolean,
        default: false
    },
    // Flag indicating if the distress situation has been resolved
    resolved: {
        type: Boolean,
        default: false
    },
    // Additional device and status information
    additionalDetails: {
        type: [{
            timeAdded: {
                type: Date,
                default: Date.now
            },
            batteryLevel: {
                type: String,
                required: true
            },
            phoneStatus: {
                type: String,
                // required: true  // [TRIAL AND ERROR] - Testing optional phone status
            }
        }],
        required: true
    },
    // Collection of audio recordings related to the distress signal
    audioRecordings: {
        type: [{url: String, timeAdded: {type:Date, default: Date.now}}]
    },
    // Timestamps for record creation and updates
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

// Create and export the Distress model
const Distress = mongoose.model('Distress', distressSchema);

export default Distress;
