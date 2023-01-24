const mongoose = require('mongoose');
const findOrCreate = require("mongoose-findorcreate");

// stationID, sessionStartTime, SessionEndTime, cookieCount
const UserSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
}, {
    timestamps: true
});

UserSchema.plugin(findOrCreate);

const User = mongoose.model('User', UserSchema);
module.exports = User;