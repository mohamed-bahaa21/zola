const mongoose = require('mongoose');
const findOrCreate = require("mongoose-findorcreate");

const UserSchema = new mongoose.Schema({
    stripeId: {
        type: String,
        required: false,
    },
    name: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: true
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
        required: true
    },
    billingID: { type: String },
    hasTrial: { type: Boolean, default: false },
    endDate: { type: Date, default: null },
    otp: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OTP',
        required: true,
    },
    subscriptions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

UserSchema.plugin(findOrCreate);
const User = mongoose.model('User', UserSchema);
module.exports = User;