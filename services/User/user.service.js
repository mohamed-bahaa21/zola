const addUser = (User) => ({ phone, billingID, plan, endDate, otp, verified }) => {
    // if (!phone || !billingID || !plan || !endDate || !otp) { throw new Error('Missing Data. Please provide values for phone, billingID, plan') }
    console.log(phone);
    console.log(otp);
    if (!phone) { throw new Error('Missing Data. Please provide values for phone number') }

    const user = new User({ phone, billingID, plan, endDate, otp, verified })
    return user.save()
}

const getUsers = (User) => () => {
    return User.find({})
}

const getUserByPhone = (User) => async (phone) => {
    return await User.findOne({ phone: phone }).populate('otp')
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
