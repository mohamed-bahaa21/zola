const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

let test_tokens = ["tok_visa", "tok_amex", "tok_mastercard", "tok_visa_debit"]
let test_numbers = {
    visa: { number: '4242424242424242', cvc: '123', date: '12/34' },
    master_card: { number: '5555555555554444', cvc: '123', date: '12/34' },
    american_express: { number: '378282246310005', cvc: '1234', date: '12/34' }
}

const create_checkout_session = async (customer, price) => {
    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer,
        line_items: [
            {
                price,
                quantity: 1,
            },
        ],
        subscription_data: {
            trial_period_days: process.env.TRIAL_DAYS,
        },
        success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:3000/failed`,
    });

    return session;
};

// create customer
const create_customer = async (phoneNumber) => {
    // Create a new customer
    const new_customer = stripe.customers.create({
        phone: phoneNumber,
        description: "New Customer"
    });
    return new_customer
}

const get_customer_by_id = async (id) => {
    const customer = await stripe.customers.retrieve(id)
    return customer
}

const create_billing_session = async (customer) => {
    const session = await Stripe.billingPortal.sessions.create({
        customer,
        return_url: 'https://localhost:3000'
    })
    return session
}

const create_webhook = (rawBody, sig) => {
    const event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
    )
    return event
}

module.exports = {
    create_checkout_session,
    create_customer,
    get_customer_by_id,
    create_billing_session,
    create_webhook
};

// POST create sub
function create_sub(err, user) {
    stripe.products.create({
        name: 'My Subscription Product',
        type: 'service',
    }, (err, product) => {
        stripe.plans.create({
            currency: 'usd',
            interval: 'month',
            product: product.id,
            nickname: 'Monthly Subscription Plan',
            amount: 999,
        }, (err, plan) => {
        });
    });

    stripe.subscriptions.create({
        customer: user.id,
        items: [{ plan: planId }],
    });

    stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.id,
    })

    stripe.paymentIntents.create({
        amount: amount,
        currency: currency,
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
    });

    stripe.paymentIntents.confirm(paymentIntentId);


    // Create a new subscription for the customer
    stripe.subscriptions.create({
        customer: customer.id,
        items: [{ plan: 'plan_abcdefghijklmno' }]
    }, function (err, subscription) {
        if (err) {
            // Handle the error
            console.log(err);
            return;
        }

        // Subscription created successfully
        console.log(subscription);
    });
}

// GET get sub
function get_sub(err, customer) {
    // Retrieve the subscription's ID
    const subscriptionId = 'sub_abcdefghijklmno';
    // Cancel the subscription
    stripe.subscriptions.del(subscriptionId, function (err, confirmation) {
        if (err) {
            // Handle the error
            console.log(err);
            return;
        }
        // Subscription cancelled successfully
        console.log(confirmation);
    });
}

// DEL cancel sub
function cancel_sub(err, subscription) {
    // Retrieve the subscription's ID
    const subscriptionId = 'sub_abcdefghijklmno';

    // Cancel the subscription
    stripe.subscriptions.del(subscriptionId, function (err, confirmation) {
        if (err) {
            // Handle the error
            console.log(err);
            return;
        }

        // Subscription cancelled successfully
        console.log(confirmation);
    });
}

// GET all subs
function get_all_subs(err, subscription) {
    // Retrieve the customer's ID
    const customerId = 'cus_abcdefghijklmno';

    // Retrieve all subscriptions for the customer
    stripe.subscriptions.list({
        customer: customerId
    }, function (err, subscriptions) {
        if (err) {
            // Handle the error
            console.log(err);
            return;
        }

        // Subscriptions retrieved successfully
        console.log(subscriptions);
    });
}
// go production