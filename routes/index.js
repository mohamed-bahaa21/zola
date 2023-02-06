var express = require('express');
var router = express.Router();

const User = require('../models/User.model')
const twilio = require('../services/twilio')
const stripe = require('../services/stripe')
const UserService = require('../services/User')

async function forwardAuthenticated(req, res, next) {
  if (!req.session.customerID) {
    return next();
  }
  res.redirect('/subscribe');
}

async function ensureAuthenticated(req, res, next) {
  if (req.session.customerID) {
    return next();
  }
  res.redirect('/');
}
async function ensureSubscribed(req, res, next) {
  let userID = req.session.customerID;
  let user = await User.findOne({ _id: userID })
  if (!user.subscribed) return res.redirect('/subscribe')
  res.redirect('/soon')
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
  if (user.otp == null || user.otp.expires < new Date().getTime()) return res.redirect('/verify-phone')
  // check if the submitted token doesn't equal the otp token
  if (submited_otp != user.otp.token) return res.redirect('/verify-code')

  if (user.verified) {
    user.otp = null;
  } else {
    user.otp = null;
    user.verified = true;
  }

  let verified_user = await user.save();
  if (verified_user) {
    req.session.customerID = req.session.temp_customerID;
    res.redirect('/subscribe');
  } else {
    res.redirect('/')
  }
});

/* GET subscribe. */
router.get('/subscribe', ensureAuthenticated, async function (req, res) {
  let userID = req.session.customerID;

  let user = await User.findOne({ _id: userID });
  // if no user was found
  if (!user) return res.redirect('/')
  // if user is subscribed to the basic plan
  if (user.plan == "basic") return res.redirect('/soon');
  // otherwise render subscribe
  res.render('subscribe', { title: 'Zola', customerID: req.session.customerID, STRIPE_LINK: process.env.STRIPE_LINK });
});

// POST subscribe
router.get("/success", async (req, res) => {
  const { customerID } = req.session;

  const stripe_sessionId = req.query.session_id;
  const stripe_session = await stripe.checkout.sessions.retrieve(stripe_sessionId);

  const stripe_customerID = stripe_session.customer;
  const plan = stripe_session.display_items[0].plan.id;
  const startDate = new Date();
  const endDate = new Date();

  endDate.setMonth(endDate.getMonth() + 1);

  const subscription = new Subscription({
    stripe_customerID,
    plan,
    startDate,
    endDate,
  });

  subscription.save((err) => {
    if (err) {
      console.log("Error saving subscription to database.");
      return res.redirect('/subscribe');
    }

    console.log("Subscription saved to database.");
    User.findOneAndUpdate({ _id: customerID }, {
      $push: { subscriptions: subscription._id },
      $set: {
        subscribed: true,
        last_subscription: subscription._id
      }
    }, function (error) {
      if (error) {
        console.log("Error updating User in database.");
        return res.redirect('/subscribe');
      }
      return res.redirect('/soon');
    });
  });
});

router.get("/failed", (req, res) => {
  res.redirect('/')
});


/* GET soon. */
router.get('/soon', ensureAuthenticated, ensureSubscribed, function (req, res) {
  res.render('soon', { title: 'Zola' });
});

router.post('/incoming-sms', async (req, res) => {
  // TODO: make a messages model in DB to track each user messages
  const sender_number = req.body.From;

  let user = await User.findOne({ phone: `${sender_number}` })

  if (user.verified && user.subscribed) {
    let generated_response = await openai.generateResponse(Body);

    if (generated_response) {
      const twilio_response = new twilio.MessagingResponse();
      twilio_response.message(generated_response);
      res.send(twilio_response.toString());

    } else {
      console.log("Error: Couldn't generate the response.");
      res.send()
    }
  } else {
    console.log("Error: User is not verified or subscribed.");
    res.send()
  }

  // res.writeHead(200, { "Content-Type": "text/xml" });
  // res.end(twilio_response.toString());
});

router.post('/webhook', async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK;

  let event;
  let signature = req.headers["stripe-signature"];

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      endpointSecret
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // case: subscription ends
  if (event.type === "customer.subscription.deleted") {
    // Handle the event here
    // const subscription = event.data.object;
    const customerID = event.data.object.customer;

    let unsubscribed_user = await User.findOneAndUpdate({ customerID: customerID }, { subscribed: false })
    if (!unsubscribed_user) {
      console.log(`Subscription ended: ${subscription.id}`);
      return res.status(400).send(`Webhook Error: Couldn't unsubscribe user.`);
    }
  }

  res.json({ received: true });
});


// TODO:: API protection via chech_private_key
function check_private_key(req, res, next) {
  let private_key = req.body.private_key
  if (private_key !== process.env.RSA_ENC) {
    return false;
  } else {
    return true;
  }
}

module.exports = router;