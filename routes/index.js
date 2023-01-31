var express = require('express');
var router = express.Router();

const fs = require('fs');
const moment = require('moment');
// const mdq = require('mongo-date-query');
const json2csv = require('json2csv').parse;
const path = require('path')
const fields = ['stationID', 'sessionStartTime', 'sessionEndTime', 'cookiesCount'];

const User = require('../models/User.model')
const twilio = require('../services/twilio')
const stripe = require('../services/stripe')
const UserService = require('../services/User')

const has_plan = require('../middlewares/has_plan')
const set_current_user = require('../middlewares/set_currentUser')

function ensureAuthenticated(req, res, next) {
  if (req.session.customerID) {
    return next();
  }
  res.redirect('/');
}

function forwardAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/profile');
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
  let phoneNumber = req.body.phoneNumber;

  let new_otp = twilio.generateOTP();
  if (new_otp) {
    let sendOTP = sendOTP(phoneNumber, new_otp);
    if (!sendOTP) res.redirect('/verify-phone')

    let customer = await UserService.getUserByPhone(phone)
    // const user = User.findOrCreate({ phoneNumber: phoneNumber, otp: new_otp.id })
    req.session.temp_customerID = customer.id
    req.session.new_otp = new_otp;
    let customerInfo = {}

    if (!customer) {
      console.log(`phone ${phone} does not exist. Making one. `)
      try {
        customerInfo = await stripe.create_customer(phone, new_otp)

        customer = await UserService.addUser({
          phone: customerInfo.phone,
          billingID: customerInfo.id,
          plan: 'none',
          endDate: null,
          otp: new_otp.id
        })

        console.log(`A new Customer signed up and addded to DB. The ID for ${phone} is ${JSON.stringify(customerInfo)}`)
        console.log(`Customer also added to DB. Information from DB: ${customer}`)
      } catch (e) {
        console.log(e)
        res.status(200).json({ e })
        return
      }
    } else {
      const isTrialExpired = customer.plan != 'none' && customer.endDate < new Date().getTime()

      if (isTrialExpired) {
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

      customerInfo = await stripe.getCustomerByID(customer.billingID)
      console.log(`The existing ID for ${phone} is ${JSON.stringify(customerInfo)}`)
    }

    req.session.phone = phone

    res.redirect('/verify-code');
  } else {
    res.redirect('/verify-phone')
  }
});


/* GET verify code. */
router.get('/verify-code', forwardAuthenticated, function (req, res) {
  let temp_customerID = req.session.temp_customerID;
  let new_otp = req.session.new_otp.token;

  if (new_otp && temp_customerID) {
    req.session.customerID = temp_customerID;
    res.render('verify-code', { title: 'Zola' }, { new_otp: new_otp });
  } else {
    res.redirect('/verify-phone')
  }
});
router.post('/verify-code', forwardAuthenticated, function (req, res) {
  let customerID = req.session.customerID
  let verified = twilio.verifyOTP(req.body.otp)

  if (verified) {
    res.redirect('/subscripe')
  } else {
    res.redirect('/verify-code')
  }
});

/* GET sign up. */
router.get('/subscripe', forwardAuthenticated, function (req, res) {
  res.render('subscripe', { title: 'Zola', customerID: req.session.customerID });
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
const set_current_user = require('../middlewares/set_currentUser')
router.get('/soon', forwardAuthenticated, [set_current_user, has_plan('basic')], function (req, res) {
  res.render('soon', { title: 'Zola' });
});

router.get("/success", (req, res) => {
  res.send("Payment successful");
});

router.get("/failed", (req, res) => {
  res.send("Payment failed");
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

app.post('/checkout', setCurrentUser, async (req, res) => {
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

app.post('/billing', set_current_user, async (req, res) => {
  const { customer } = req.body
  console.log('customer', customer)

  const session = await stripe.createBillingSession(customer)
  console.log('session', session)

  res.json({ url: session.url })
})

app.post('/webhook', async (req, res) => {
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