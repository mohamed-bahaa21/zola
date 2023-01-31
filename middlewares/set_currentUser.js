const UserService = require('../services/User')

module.exports = async function set_currentUser(req, res, next) {
    const { customerID } = req.session

    if (customerID) {
        user = await UserService.getUserByPhone(customerID)

        req.user = user
        next()
    } else {
        res.redirect('/')
    }
}
