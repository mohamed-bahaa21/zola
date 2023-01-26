const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
    token: { type: String, required: true },
    expires: { type: Date },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const OTP = mongoose.model('OTP', OTPSchema);
module.exports = OTP