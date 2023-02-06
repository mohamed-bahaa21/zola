const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
    secret: { type: Object, required: true },
    token: { type: String, required: true },
    sent: { type: Boolean, required: true, default: false },
    expires: { type: Date },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const OTP = mongoose.model('OTP', OTPSchema);
module.exports = OTP