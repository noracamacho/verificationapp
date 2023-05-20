const catchError = require('../utils/catchError');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmails');
const EmailCode = require('../models/EmailCode');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const getAll = catchError(async(req, res) => {
    const results = await User.findAll()
    return res.json(results);
});

const create = catchError(async(req, res) => {
    // Destructuring to encrypt password
    const { firstName, lastName, email, password, country, image, frontBaseUrl} = req.body;
    // Encrupt password
    const hashedPassword = await bcrypt.hash(password, 10); // 2^10 iterations - salt rounds
    // Create user with hashed password
    const user = await User.create({ email, password: hashedPassword, firstName, lastName, country, image });
    // Generate verfication code
    const code = require('crypto').randomBytes(32).toString('hex');
    // Link
    const link = `${frontBaseUrl}/verify_email/${code}`
    // http://localhost:3000/verify_email/code983498498
    // send verificaion emal
    await sendEmail({
        to: email,
        subject: "Verificate email for user app",
        html: `
            <h1>Hello ${firstName} ${lastName}</h1>
            <b>Verify you account clicking this link</b>
            <a href="${link}" target="_blank">${link}</a>
            <h3>Thank you!</h3>
        `
    });
    // Insert dara into EmailCodes table
    await EmailCode.create({ code, userId: user.id });
    return res.status(201).json(user);
});

// Get one user
const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

// Delete user
const remove = catchError(async(req, res) => {
    const { id } = req.params;
    await User.destroy({ where: {id} });
    return res.sendStatus(204);
});

// Since updating the password on user update is not a good practice, it is better to reset password
// So we eliminate the option to update the password with user update
const update = catchError(async(req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, country, image } = req.body;
    const result = await User.update(
        { firstName, lastName, email, country, image },
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const verifyCode = catchError(async(req, res) => {
    // Code received
    const { code } = req.params;
    // Verify that the code exists on table EmailCode
    const codeFound = await EmailCode.findOne({ where: { code }});
    if(!codeFound) return res.status(401).json({ message: "Invalid Credentials" });
    // Update user with isVerifued true
    const user = User.update(
        { isVerified: true }, 
        { where: { id: codeFound.userId }, returning: true }
    );
    // Delete verified code form table emailCodes
    await codeFound.destroy();
    return res.json(user);
});

const login = catchError(async(req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    // Verify if user exist
    if(!user || !user.isVerified) return res.status(401).json({ message: "Invalid Credentials" });
    // validate password
    const isValid = await bcrypt.compare(password, user.password);
    if(!isValid) return res.status(401).json({ message: "Invalid Credentials" });
    // Generate User's bearer Token
    const token = jwt.sign({ user }, process.env.TOKEN_SECRET, { expiresIn: "1d" });
    // Return user and token
    return res.json({ user, token });
});

// Logged user
// Access logged user's information
const getLogedUser = catchError(async(req, res) => {
    // const user = req.user;
    return res.json(req.user);
});

// Send password reset email
const passwordResetEmail = catchError(async(req, res) => {
    // Get user's email and front base url
    const { email, frontBaseUrl } = req.body;
    // verify if user exists or has verified account
    const user = await User.findOne({ where: { email } });
    if(!user || !user.isVerified) return res.status(401).json({ message: "Invalid Credentials" });
    // Generate password reset code
     const code = require('crypto').randomBytes(32).toString('hex');
     // Link
     const link = `${frontBaseUrl}/reset_password/${code}`;
      // send password recovery email
    await sendEmail({
        to: email,
        subject: "Password recovery for user app",
        html: `
            <h1>Hello ${user.firstName} ${user.lastName}</h1>
            <b>To reset your password please click on the following link: </b>
            <a href="${link}" target="_blank">${link}</a>
            <h3>Thank you!</h3>
        `
    });
    // Creat data in EmailCodes table
    await EmailCode.create({ code, userId: user.id });
    return res.status(201).json(user);
});

const passwordReset = catchError(async(req, res) => {
    // Code received
    const { code } = req.params;
    const { password } = req.body;
    // Verify that the code exists in table EmailCodes
    const codeFound = await EmailCode.findOne({ where: { code }});
    if(!codeFound) return res.status(401).json({ message: "Invalid Credentials" });
    const hashedPassword = await bcrypt.hash(password, 10); // 2^10 iterations - salt rounds
    // Update User with new password
    const user = await User.update(
        { password: hashedPassword }, 
        { where: { id: codeFound.userId }, returning: true }
    );
    // Delete verified code form table emailCodes
    await codeFound.destroy();
    return res.json(user);
});

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    verifyCode,
    login,
    getLogedUser,
    passwordResetEmail,
    passwordReset
}