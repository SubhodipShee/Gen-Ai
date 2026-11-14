const mongoose = require('mongoose')


// counts how many times the whole app called Gemini on one day (Pacific time, when Google resets the free quota)
const aiUsageSchema = new mongoose.Schema({
    date: {
        type: String, // e.g. "2026-11-14"
        required: [true, "date is required"],
        unique: true
    },
    count: {
        type: Number,
        default: 0
    }
},{
    timestamps: true
})

// old days are not needed anymore, delete them after 7 days
aiUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 })

// create a model for ai usage
const aiUsageModel = mongoose.model("aiUsage", aiUsageSchema)


module.exports = aiUsageModel
