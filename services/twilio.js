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

const generateOTP = async (userID) => {
    const secret = speakeasy.generateSecret({ length: 20 });
    const token = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32'
    });
    const token6digits = Math.floor(token % 1000000)

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 30);

    const new_otp = new OTP({ token: token6digits, expires: expires, user: userID });
    new_otp.save();

    return new_otp;
}

function sendOTP(phoneNumber, otp) {
    client.messages.create({
        body: `Your OTP is ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
    })
        .then(message => {
            console.log(message.sid)
            return true;
        })
        .catch(err => {
            return false;
        });
}

function verifyOTP(userEnteredToken) {
    const userEnteredToken6digits = Math.floor(userEnteredToken % 1000000)
    const verified = speakeasy.totp.verify({
        secret: secret.base32,
        encoding: 'base32',
        token: userEnteredToken6digits
    });
    return verified;
}

module.exports = {
    generateOTP,
    sendOTP,
    verifyOTP
}