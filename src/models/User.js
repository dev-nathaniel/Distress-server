import mongoose from "mongoose";

// Schema definition for User accounts
const userSchema = new mongoose.Schema({
    // User's full name with whitespace trimming
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    // User's email address - must be unique and lowercase
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    // Hashed password for user authentication
    password: {
        type: String,
        required: true
    },
    // User's primary phone number - must be unique
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // User's residential address
    homeAddress: {
        type: String,
        required: true,
        trim: true
    },
    // Array of emergency contacts with their details
    emergencyContacts: {
        type: [{
            name: { type: String },                    // Full name of emergency contact
            firstName: { type: String },               // First name of emergency contact
            lastName: { type: String },                // Last name of emergency contact
            emails: [{                                // Array of email addresses
                type: String,
            }],
            phoneNumbers: [{                          // Array of phone numbers with detailed format
                number: { type: String },             // Full phone number as string
                digits: { type: String },             // Numeric digits only
                countryCode: { type: String }         // Country calling code
            }]
        }],
        required: false                               // Emergency contacts are optional
    },
    // User role for access control
    role: {
        type: String,
        required: true,
        enum: ['user', 'admin'],                      // Only 'user' or 'admin' roles allowed
        default: 'user'                               // Default role is 'user'
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
});

// Create and export the User model
const User = mongoose.model('User', userSchema);

export default User;
