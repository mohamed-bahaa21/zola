const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    stripeId: {
        type: String,
        required: true,
    },
    plan: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription