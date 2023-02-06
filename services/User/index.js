const User = require('../../models/User.model')
const UserService = require('./user.service')

module.exports = UserService(User)