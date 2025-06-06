import mongoose from "mongoose";

const distressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    location: {
        type: [{
            coords: {
                accuracy: { type: Number, required: true },
                altitude: { type: Number, required: true },
                altitudeAccuracy: { type: Number, required: true },
                heading: { type: Number, required: true },
                latitude: { type: Number, required: true },
                longitude: { type: Number, required: true },
                speed: { type: Number, required: true }
            },
            timestamp: { type: Number, required: true }
        }],
        required: true
    },
    escalated: {
        type: {
            status: { type: Boolean, default: false },
            by: {
                type: {
                    email: { type: String },
                    phoneNumber: { type: String }
                },
                default: { email: null, phoneNumber: null }
            },
            additionalInfo: {type: String}
        },
        default: { status: false, by: null }
    },
    droneDeployed: {
        type: Boolean,
        default: false
    },
    resolved: {
        type: Boolean,
        default: false
    },
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
                // required: true
            }
        }],
        required: true
    },
    audioRecordings: {
        type: [{url: String, timeAdded: {type:Date, default: Date.now}}]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

const Distress = mongoose.model('Distress', distressSchema);

export default Distress;
