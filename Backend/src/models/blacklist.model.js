const moongoose = require('mongoose')


// create a schema for blacklist token
const blacklistTokenSchema = new moongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required to be in blacklist"]
    }
},{
    timestamps: true
})

// create a model for blacklist token
const blacklistTokenModel = moongoose.model("blacklistTokens", blacklistTokenSchema)


module.exports = blacklistTokenModel

