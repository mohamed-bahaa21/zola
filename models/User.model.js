const mongoose = require('mongoose');
const findOrCreate = require("mongoose-findorcreate");

const UserSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    status: {
        type: String,
        enum: ['none', 'subed'],
        default: 'none',
        required: false
    },
    otp: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OTP',
        required: false,
    },
    subscriptions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    }],
    stripeId: {
        type: String,
        required: false,
    },
    plinkId: {
        type: String,
        required: false
    },
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
    billingID: { type: String },
    hasTrial: { type: Boolean, default: false },
    endDate: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

UserSchema.plugin(findOrCreate);
const User = mongoose.model('User', UserSchema);
module.exports = User;