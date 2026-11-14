const express = require('express')
const authRouter = express.Router()
const authController = require("../controllers/auth.controller")
const authMiddleware = require("../middleware/auth.middleware")
const { loginLimiter, registerLimiter } = require("../middleware/rateLimit.middleware")


/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
authRouter.post("/register", registerLimiter, authController.registerUserController)

/**
 * @route POST /api/auth/login
 * @desc Login a user with email and password
 * @access Public
 */
authRouter.post("/login", loginLimiter, authController.loginUserController)

/**
 * @route GET /api/auth/logout
 * @desc Logout a user by blacklisting the token
 * @access Public
 */
authRouter.get("/logout",authController.logoutUserController)

/**
 * @route GET /api/auth/get-me
 * @desc Get the currently logged in user's information
 * @access Private
 */
authRouter.get("/get-me", authMiddleware.authUser,authController.getMeController)



module.exports = authRouter