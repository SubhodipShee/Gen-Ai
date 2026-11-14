const jwt = require("jsonwebtoken")
const blacklistTokenModel = require("../models/blacklist.model")


async function authUser(req, res, next) {
    const token = req.cookies.token

    if(!token) {
        return res.status(401)
        .json({ message: "Token not provided" })
    }

    // verify the token first, it needs no database call, so bad tokens are rejected fast
    let decoded
    try {

        decoded = jwt.verify(token, process.env.JWT_SECRET)

    }catch (err) {
        return res.status(401)
        .json({ message: "Unauthorized" })
    }

    const isTokenBlacklisted = await blacklistTokenModel.exists({
        token
    })


    if(isTokenBlacklisted) {
        return res.status(401).json({
            message: "Token is invalid"
        })
    }

    req.user = decoded

    next()
}


module.exports = {authUser}