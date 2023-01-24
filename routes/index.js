var express = require('express');
var router = express.Router();

const fs = require('fs');
const moment = require('moment');
// const mdq = require('mongo-date-query');
const json2csv = require('json2csv').parse;
const path = require('path')
const fields = ['stationID', 'sessionStartTime', 'sessionEndTime', 'cookiesCount'];

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
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

/* GET verify code. */
router.get('/verify-code', forwardAuthenticated, function (req, res) {
  res.render('verify-code', { title: 'Zola' });
});

/* GET sign up. */
router.get('/signup', forwardAuthenticated, function (req, res) {
  res.render('signup', { title: 'Zola' });
});

/* GET soon. */
router.get('/soon', ensureAuthenticated, function (req, res) {
  res.render('soon', { title: 'Zola' });
});

/* GET logout. */
router.get('/logout', ensureAuthenticated, function (req, res) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

function check_private_key(req, res, next) {
  let private_key = req.body.private_key
  if (private_key !== process.env.RSA_ENC) {
    return false;
  } else {
    return true;
  }
}

/* GET api */
router.get('/api', async function (req, res, next) {
  if (!req.body.private_key || !req.body.stationID) return res.send({ msg: "Unautherized." })
  // console.log(req.body);
  let checky = check_private_key(req, res, next)
  if (!checky) return res.send({ msg: "Please, Make sure the private_key is valid." });

  let current_stationID = req.body.stationID || req.headers['stationID'] || req.params.stationID
  if (current_stationID == undefined) res.json({ msg: "Please send the stationID." })

  let find_session = await WSession.findOne({ stationID: `${current_stationID}`, sessionEndTime: undefined });

  // for development
  development_current_stationID(current_stationID)

  // case: no session was found with that ID
  if (!find_session) {
    let newSession = new WSession({
      stationID: `${current_stationID}`,
      cookiesCount: 0,
      sessionStartTime: Date.now(),
      sessionEndTime: undefined,
    })

    let save_newSession = await newSession.save();
    if (save_newSession) return res.status(200).json({ msg: 'New session created.', current_stationID })
  }

  // case: session was found with that ID
  if (find_session) {
    // case: session end time was undefined
    if (find_session.sessionEndTime == undefined) {
      find_session.sessionEndTime = Date.now()
      let save_currentSession = await find_session.save()
      if (save_currentSession) return res.json({ msg: 'Closed the session.', current_stationID })
    }

    // case: session end time was updated before
    if (find_session.sessionEndTime != undefined) {
      let newSession = new WSession({
        stationID: `${current_stationID}`,
        cookiesCount: 0,
        sessionStartTime: Date.now(),
        sessionEndTime: undefined,
      })

      let save_newSession = await newSession.save();
      if (save_newSession) return res.status(200).json({ msg: 'Session with identical stationID was closed before, So new session is created.', current_stationID })
    }
  }

});

/* POST add a new cookie. */
router.get('/api/add_cookie', async function (req, res, next) {
  if (!req.body.private_key || !req.body.stationID) return res.send({ msg: "Unautherized." })
  // console.log(req.body);
  let checky = check_private_key(req, res, next)
  if (!checky) return res.send({ msg: "Please, Make sure the private_key is valid." });

  let current_stationID = req.body.stationID || req.headers['stationID'] || req.params.stationID
  if (current_stationID == undefined) res.json({ msg: "Please send the stationID." })

  // for development
  development_current_stationID(current_stationID)

  let find_session = await WSession.findOne({ stationID: `${current_stationID}`, sessionEndTime: undefined });

  // case: no session was found with that ID
  if (!find_session) {
    let newSession = new WSession({
      stationID: `${current_stationID}`,
      cookiesCount: 1,
      sessionStartTime: Date.now(),
      sessionEndTime: undefined,
    })

    let save_newSession = await newSession.save();
    if (save_newSession) return res.status(200).json({ msg: 'New session created, and one cookie was added.', current_stationID })
  }

  // case: session was found with that ID
  if (find_session) {
    // case: session end time was undefined
    if (find_session.sessionEndTime == undefined) {
      find_session.cookiesCount += 1;

      let save_currentSession = await find_session.save()
      if (save_currentSession) return res.json({ msg: 'Added a new cookie.', current_stationID })
    }

    // case: session end time was updated before
    if (find_session.sessionEndTime !== undefined) {
      return res.json({ msg: "You can't add new cookies. This session was closed" })
    }
  }

});

/* POST close session. */
// router.get('/api/close_session', function (req, res, next) {
//   check_private_key(req, res), next;

//   let current_stationID = req.body.stationID || req.headers['stationID'] || req.params.stationID
//   WSession.findOneAndUpdate({ stationID: current_stationID }, { sessionEndTime: Date.now() })
//     .then(err => {
//       if (err) return res.send(err)
//       res.send('cookie was added to ', current_stationID);
//     })
//     .catch(err => {
//       res.send(err)
//     })
// });

module.exports = router;