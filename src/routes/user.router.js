const { getAll, create, getOne, remove, update, verifyCode, login, getLogedUser, passwordResetEmail, passwordReset } = require('../controllers/user.controllers');
const express = require('express');
const verifyJWT = require('../utils/verifyJWT');

const userRouter = express.Router();

userRouter.route('/') // /users
    .get(verifyJWT, getAll)
    .post(create);

userRouter.route('/login') // /users/login
    .post(login);

userRouter.route('/me') // /users/me
    .get(verifyJWT, getLogedUser);

userRouter.route('/reset_password') // /users/reset_password
    .post(passwordResetEmail);

userRouter.route('/reset_password/:code') // /users/reset_password/:code
    .post(passwordReset);

userRouter.route('/verify/:code') // /users/verify/:code
    .get(verifyCode);

userRouter.route('/:id') // /users/:id
    .get(verifyJWT, getOne)
    .delete(verifyJWT, remove)
    .put(verifyJWT, update);

module.exports = userRouter;