const moongoose = require('mongoose')


// create a schema for blacklist token
const blacklistTokenSchema = new moongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required to be in blacklist"],
        index: true // the auth middleware searches by token on every private request
    }
},{
    timestamps: true
})

// delete blacklisted tokens after 1 day, the same time the JWT expires, so the collection does not grow forever
blacklistTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 })

// create a model for blacklist token
const blacklistTokenModel = moongoose.model("blacklistTokens", blacklistTokenSchema)


module.exports = blacklistTokenModel

