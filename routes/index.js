var express = require('express');
var router = express.Router();

const fs = require('fs');
const moment = require('moment');
// const mdq = require('mongo-date-query');
const json2csv = require('json2csv').parse;
const path = require('path')
const fields = ['stationID', 'sessionStartTime', 'sessionEndTime', 'cookiesCount'];

const User = require('../models/User.model')
const OTP = require('../models/OTP.model')
const twilio = require('../services/twilio')
const stripe = require('../services/stripe')
const UserService = require('../services/User')

const has_plan = require('../middlewares/has_plan')
const set_current_user = require('../middlewares/set_currentUser');
const { log } = require('console');

function ensureAuthenticated(req, res, next) {
  if (req.session.customerID) {
    return next();
  }
  res.redirect('/');
}

function forwardAuthenticated(req, res, next) {
  if (!req.session.customerID) {
    return next();
  }
  res.redirect('/subscripe');
}

/* GET home page. */
router.get('/', forwardAuthenticated, function (req, res, next) {
  res.render('index', { title: 'Zola' });
});

/* GET verify phone page. */
router.get('/verify-phone', forwardAuthenticated, function (req, res) {
  res.render('verify-phone', { title: 'Zola' });
});

/* POST verify phone page. */
router.post('/verify-phone', forwardAuthenticated, async function (req, res) {
  let phone = req.body.phoneNumber;
  var new_otp;

  // get the user with phone number from database.
  // we also can use findOrCreate function on the database directly.
  // const user = User.findOrCreate({ phone: phone, otp: new_otp.id })
  let customer = await UserService.getUserByPhone(phone)
  console.log("customer: ", customer);

  // couldn't find a customer.
  if (!customer) {
    // let customerInfo = {}
    console.log(`phone ${phone} does not exist. Making one. `)
    try {
      // in case using stripe checkout, create a new user in database.
      customer = await UserService.addUser({
        phone: phone,
        plan: 'none',
        endDate: null,
        otp: null,
        verified: false
      })

      console.log(`A new Customer signed up and addded to DB. The ID for ${phone} is ${JSON.stringify(customer._id)}`)
      console.log(`Customer also added to DB. Information from DB: ${customer}`)
    } catch (e) {
      console.log('here 2');
      console.log(e)
      res.status(200).json({ e })
      return
    }

  } else {
    // customer was found in DB
    console.log(customer.id);

    // check if subscription ended.
    console.log(customer.plan);
    console.log(customer.endDate);
    const isTrialExpired = customer.plan != 'none' && customer.endDate < new Date().getTime()

    if (isTrialExpired) {
      // user didn't subscribe
      console.log('trial expired')
      customer.hasTrial = false
      customer.save()
    } else {
      console.log(
        'no trial information',
        customer.hasTrial,
        customer.plan != 'none',
        customer.endDate < new Date().getTime()
      )
    }
  }

  // signup: check if customer isn't verified
  // login: check if customer is verified.
  // ===============
  // check OTP process.
  if (!customer.verified || customer.verified) {
    // signup: check if customer doesn't have OTP,
    // Or found an expired one.
    if (customer.otp == null || customer.otp.expires < new Date().getTime()) {
      console.log('No OTP was found for this User.');
      console.log('OR Expired OTP was already found for this User.');
      new_otp = twilio.generateOTP();

      customer.otp = new_otp
      customer.save()
    } else if (customer.otp.expires > new Date().getTime()) {
      // check if unexpired OTP was found.
      new_otp = customer.otp;

    }
  }

  // check if the otp was sent via SMS to the User
  if (!new_otp.sent) {
    // check if OTP wasn't sent for the User
    let sendOTP = await twilio.sendOTP(phone, new_otp);
    console.log(sendOTP);

    // OTP wasn't sent error
    if (!sendOTP) {
      console.log('here 1');
      res.redirect('/verify-phone')
    }
  }

  /* 
    set the local temporary customer id to be the customer id in the database,
    so the user will be logged in.
  */
  // save id to memory session
  req.session.temp_customerID = customer.id
  // set the local otp to the global one.
  req.session.new_otp = new_otp;
  // set the local phone to the global one.
  req.session.phone = phone
  // console.log(req.session);
  res.redirect('/verify-code');
});


/* GET verify code. */
router.get('/verify-code', forwardAuthenticated, function (req, res) {
  let temp_customerID = req.session.temp_customerID;
  let new_otp = req.session.new_otp;

  // console.log(temp_customerID);
  console.log(new_otp);

  if (new_otp && temp_customerID) {
    // req.session.customerID = temp_customerID;
    let token = new_otp.token;
    console.log('render verify-code');
    res.render('verify-code', { title: 'Zola', new_otp: token });
  } else {
    res.redirect('/verify-phone')
  }
});

router.post('/verify-code', async function (req, res) {
  let { token, secret } = req.session.new_otp
  let { submited_otp } = req.body;
  let temp_customerID = req.session.temp_customerID;
  // console.log(req.session.new_otp);

  // otherwise verify the full token version with the secret
  // let verified = twilio.verifyOTP(token, secret)
  let user = await User.findOne({ _id: temp_customerID }).populate('otp');

  // check if the otp expired
  if (user.otp == null || user.otp.expires < new Date().getTime()) {
    console.log('here 10');
    return res.redirect('/verify-phone')
  }
  // check if the submitted token doesn't equal the otp token
  if (submited_otp != user.otp.token) {
    console.log('here 20');
    return res.redirect('/verify-code')
  }

  if (user.verified) {
    user.otp = null;
  } else {
    user.otp = null;
    user.verified = true;
  }

  let verified_user = await user.save();
  if (verified_user) {
    req.session.customerID = req.session.temp_customerID;
    res.redirect('/subscripe');
  } else {
    res.redirect('/')
  }
});

/* GET subscripe. */
router.get('/subscripe', ensureAuthenticated, async function (req, res) {
  let userID = req.session.customerID;

  let user = await User.findOne({ _id: userID });
  if (!user) return res.redirect('/')

  if (user.plan == "basic") {
    return res.redirect('/soon');
  }

  res.render('subscripe', { title: 'Zola', customerID: req.session.customerID, STRIPE_LINK: process.env.STRIPE_LINK });
});

// POST subscripe
router.post("/subscripe", async (req, res) => {
  const { customerID } = req.session;
  const session = await stripe.create_checkout_session(
    customerID,
    productToPriceMap.BASIC
  );

  console.log(session);
  res.send({
    sessionId: session.id,
  });
});

/* GET soon. */
router.get('/soon', ensureAuthenticated, function (req, res) {
  res.render('soon', { title: 'Zola' });
});

router.post('/checkout/success', async (req, res) => {
  const { sessionId } = req.query;

  stripe.get_

  res.send('Payment succeeded');
});

router.get("/checkout/failed", (req, res) => {
  res.redirect('/')
});

// TODO:: API 
function check_private_key(req, res, next) {
  let private_key = req.body.private_key
  if (private_key !== process.env.RSA_ENC) {
    return false;
  } else {
    return true;
  }
}

router.post('/checkout', set_current_user, async (req, res) => {
  const customer = req.user
  const { product, customerID } = req.body

  const price = productToPriceMap[product]

  try {
    const session = await stripe.create_checkout_session(customerID, price)

    const ms =
      new Date().getTime() + 1000 * 60 * 60 * 24 * process.env.TRIAL_DAYS
    const n = new Date(ms)

    customer.plan = product
    customer.hasTrial = true
    customer.endDate = n
    customer.save()

    res.send({
      sessionId: session.id
    })
  } catch (e) {
    console.log(e)
    res.status(400)
    return res.send({
      error: {
        message: e.message
      }
    })
  }
})

router.post('/billing', set_current_user, async (req, res) => {
  const { customer } = req.body
  console.log('customer', customer)

  const session = await stripe.createBillingSession(customer)
  console.log('session', session)

  res.json({ url: session.url })
})

router.post('/webhook', async (req, res) => {
  let event

  try {
    event = stripe.create_webhook(req.body, req.header('Stripe-Signature'))
  } catch (err) {
    console.log(err)
    return res.sendStatus(400)
  }

  const data = event.data.object

  console.log(event.type, data)
  switch (event.type) {
    case 'customer.created':
      console.log(JSON.stringify(data))
      break
    case 'invoice.paid':
      break
    case 'customer.subscription.created': {
      const user = await UserService.getUserByBillingID(data.customer)

      if (data.plan.id === process.env.PRODUCT_BASIC) {
        console.log('You are talking about basic product')
        user.plan = 'basic'
      }

      if (data.plan.id === process.env.PRODUCT_PRO) {
        console.log('You are talking about pro product')
        user.plan = 'pro'
      }

      user.hasTrial = true
      user.endDate = new Date(data.current_period_end * 1000)

      await user.save()

      break
    }
    case 'customer.subscription.updated': {
      // started trial
      const user = await UserService.getUserByBillingID(data.customer)

      if (data.plan.id == process.env.PRODUCT_BASIC) {
        console.log('You are talking about basic product')
        user.plan = 'basic'
      }

      if (data.plan.id === process.env.PRODUCT_PRO) {
        console.log('You are talking about pro product')
        user.plan = 'pro'
      }

      const isOnTrial = data.status === 'trialing'

      if (isOnTrial) {
        user.hasTrial = true
        user.endDate = new Date(data.current_period_end * 1000)
      } else if (data.status === 'active') {
        user.hasTrial = false
        user.endDate = new Date(data.current_period_end * 1000)
      }

      if (data.canceled_at) {
        // cancelled
        console.log('You just canceled the subscription' + data.canceled_at)
        user.plan = 'none'
        user.hasTrial = false
        user.endDate = null
      }
      console.log('actual', user.hasTrial, data.current_period_end, user.plan)

      await user.save()
      console.log('customer changed', JSON.stringify(data))
      break
    }
    default:
  }
  res.sendStatus(200)
})

module.exports = router;