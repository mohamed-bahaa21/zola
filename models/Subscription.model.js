const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    stripe_customerID: String,
    plan: String,
    startDate: Date,
    endDate: Date,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription