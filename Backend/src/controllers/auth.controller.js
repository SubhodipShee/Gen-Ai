const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const blacklistTokenModel = require("../models/blacklist.model")


/** * @name registerUserController
 * @desc Register a new user , expects name, email and password in the request body
 * @access Public
 */

async function registerUserController(req, res) {
    const { username, email, password } = req.body

    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ message: "Please provide username, email and password" })
    }

    const isUserAlreadyExists = await userModel.findOne({ 
        $or: [{username},{email}]
    })

    if (isUserAlreadyExists) {

        return res.status(400).json({ 
            message: "User already exists" 
        })
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await  userModel.create({
        username,
        email,
        password: hash
    })

    const token = jwt.sign({
        id: user._id,
        username: user.username},
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    ) 

    //this is for only deployed version, in development we can just set the cookie without secure and sameSite attributes
   const isProduction = process.env.NODE_ENV === "production";

        res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "None" : "Lax"
    });

    res.status(201).json({
        message: "User registered successfully",
        user:{
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}


/**
 * @name loginUserController
 * @desc Login a user , expects email and password in the request body
 * @access Public
 */

async function loginUserController(req, res) {
    const { email, password } = req.body

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({ message: "Invalid credentials" })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign({
        id: user._id,
        username: user.username},
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    ) 

    //this is for only deployed version, in development we can just set the cookie without secure and sameSite attributes
    const isProduction = process.env.NODE_ENV === "production";

        res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "None" : "Lax"
        });

    res.status(200).json({
        message: "User logged in successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}


/**
 * @name logoutUserController
 * @desc Logout a user by blacklisting the token
 * @access Public
 */
async function logoutUserController(req, res) {
    const token = req.cookies.token

    if (token) {
        await blacklistTokenModel.create({ token })
    }

    // this code is for only deployed version, in development we can just clear the cookie without blacklisting
    res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax"
    });

    res.status(200).json({
        message: "User logged out successfully"
    })
}

/**
 * 
 * @name getMeController
 * @desc Get the currently logged in user's information, expects a valid token in the cookies
 * @access Private 
 */

async function getMeController(req, res) {
 const user = await userModel.findById(req.user.id)

 res.status(200).json({
    message: "User information retrieved successfully",
    user: {
        id: user._id,
        username: user.username,
        email: user.email
    }
 })

}
module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}
