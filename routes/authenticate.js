const User = require('../models/User.model');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.serializeUser((user, done) => {
    done(null, user.id);
})

passport.deserializeUser((user, done) => {
    done(null, user);
})

let local_callback = "http://localhost:3000/google/callback"
let heroku_callback = 'https://micro-cookies.herokuapp.com/google/callback'

let callback;
if (global.ENVIRONMENT == 'development') callback = local_callback
if (global.ENVIRONMENT == 'production') callback = heroku_callback

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/google/callback"
},
    function (accessToken, refreshToken, profile, cb) {
        // Register user here.
        let emaily = profile.emails[0].value
        if (!process.env.ALLOWED_EMAILS.includes(emaily)) return cb(("Invalid email"), null);
        // console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

// Use in routes
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

require('./authenticate');

router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/profile')
    }
)

passport.serializeUser((user, done) => {
    done(null, user.id);
})

passport.deserializeUser((user, done) => {
    done(null, user);
})