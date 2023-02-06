// const crypto = require('crypto');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const OTP = require('../models/OTP.model')

function hashOTP(otp) {
    const saltRounds = 10;
    bcrypt.hash(otp, saltRounds, function (err, hash) {
        // store the hashed OTP in the database
        return hash
    });
}

function generateOTP() {
    const secret = speakeasy.generateSecret({ length: 20 });
    const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
    });
    const token6digits = Math.floor(token % 1000000)

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 30);

    const new_otp = new OTP({ sent: false, secret: secret, token: token6digits, expires: expires });
    new_otp.save();

    return new_otp;
}

async function sendOTP(phone, otp) {

    // only for development purposes.
    // also make sure you enabled Messaging Geo-Permissions settings in Twilio account.
    return true;

    let sent_msg = await client.messages.create({
        body: `Your OTP is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
    })

    console.log(sent_msg.sid)
    console.log(sent_msg);
    return sent_msg
}

function verifyOTP(userEnteredToken, secret) {
    const userEnteredToken6digits = Math.floor(userEnteredToken % 1000000)

    const verified = speakeasy.totp.verify({
        secret: secret.base32,
        encoding: 'base32',
        token: userEnteredToken6digits
    });
    return verified;
}

/*
Store the OTP and the user's phone number in the database, 
with a flag indicating that the user is unverified.

When the user inputs the OTP, 
retrieve the stored OTP from the database and compare it with the user's input. 
If they match, set the user's verification flag to true and log them in.
*/

module.exports = {
    generateOTP,
    sendOTP,
    verifyOTP
}