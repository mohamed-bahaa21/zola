const User = require('../../models/User.model')
const UserService = require('./User.service')

module.exports = UserService(User)