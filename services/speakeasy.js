const speakeasy = require('speakeasy');

const secret = speakeasy.generateSecret({ length: 20 });
const token = speakeasy.totp({
    secret: secret.base32,
    encoding: 'base32'
});
const token6digits = Math.floor(token % 1000000)

const userEnteredToken6digits = Math.floor(userEnteredToken % 1000000)
const verified = speakeasy.totp.verify({
    secret: secret.base32,
    encoding: 'base32',
    token: userEnteredToken6digits
});