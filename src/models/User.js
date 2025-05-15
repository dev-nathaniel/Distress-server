import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    homeAddress: {
        type: String,
        required: true,
        trim: true
    },
    emergencyContacts: {
        type: [{
            name: { type: String, required: true },
            firstName: { type: String, required: true },
            lastName: { type: String, required: true },
            emails: [{
                type: String,
                required: true
            }],
            phoneNumbers: [{
                number: { type: String, required: true },
                digits: { type: String, required: true },
                countryCode: { type: String, required: true }
            }]
        }],
        required: false
    },
    role: {
        type: String,
        required: true,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

export default User;
