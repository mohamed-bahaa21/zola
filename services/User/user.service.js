const addUser = (User) => ({ phone, billingID, plan, endDate, otp }) => {
    if (!phone || !billingID || !plan) { throw new Error('Missing Data. Please provide values for phone, billingID, plan') }

    const user = new User({ phone, billingID, plan, endDate, otp })
    return user.save()
}

const getUsers = (User) => () => {
    return User.find({})
}

const getUserByPhone = (User) => async (phone) => {
    return await User.findOne({ phoneNumber: phone })
}

const getUserByBillingID = (User) => async (billingID) => {
    return await User.findOne({ billingID })
}

const updatePlan = (User) => (phone, plan) => {
    return User.findOneAndUpdate({ phone, plan })
}

module.exports = (User) => {
    return {
        addUser: addUser(User),
        getUsers: getUsers(User),
        getUserByPhone: getUserByPhone(User),
        updatePlan: updatePlan(User),
        getUserByBillingID: getUserByBillingID(User)
    }
}
