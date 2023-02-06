const mongoose = require('mongoose');
const findOrCreate = require("mongoose-findorcreate");

const UserSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OTP',
        required: false,
    },
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    customerID: {
        type: String,
        required: false,
        unique: true
    },
    subscribed: {
        type: Boolean,
        required: true,
        default: false
    },
    last_subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    subscriptions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    }],
    // ===========================================================
    stripe_sessionId: {
        type: String,
        required: false
    },
    name: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: false,
        unique: true,
    },
    plan: {
        type: String,
        enum: ['none', 'basic'],
        default: 'none',
        required: false
    },
    hasTrial: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

UserSchema.plugin(findOrCreate);
const User = mongoose.model('User', UserSchema);
module.exports = User;