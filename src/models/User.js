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
            name: { type: String },
            firstName: { type: String },
            lastName: { type: String },
            emails: [{
                type: String,
            }],
            phoneNumbers: [{
                number: { type: String },
                digits: { type: String },
                countryCode: { type: String }
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
