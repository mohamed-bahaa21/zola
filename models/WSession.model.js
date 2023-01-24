const mongoose = require('mongoose');

// stationID, sessionStartTime, SessionEndTime, cookieCount
const WSessionSchema = new mongoose.Schema({
  stationID: {
    type: String,
    required: true,
    unique: false
  },
  cookiesCount: {
    type: Number,
    required: true,
    default: 0
  },
  sessionStartTime: {
    type: Date,
    required: true,
    default: Date.now()
  },
  sessionEndTime: {
    type: Date,
    required: false,
    default: undefined
  },
}, {
  timestamps: true
});

const WSession = mongoose.model('WSession', WSessionSchema);

module.exports = WSession;
