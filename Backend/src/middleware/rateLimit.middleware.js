const { rateLimit } = require("express-rate-limit")
const interviewReportModel = require("../models/interviewReport.model")


const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const REPORTS_PER_HOUR = 5
const REPORTS_PER_DAY = 20

// 1 minute -> "1 minute", 23 minutes -> "23 minutes", 150 minutes -> "3 hours"
const waitText = (ms) => {
    const minutes = Math.max(1, Math.ceil(ms / MINUTE))
    const [ amount, unit ] = minutes < 60 ? [ minutes, "minute" ] : [ Math.ceil(minutes / 60), "hour" ]
    return `${amount} ${unit}${amount > 1 ? "s" : ""}`
}

// limiter that answers with a JSON message like the rest of the API
// private routes count per logged in user (byUser), public routes per IP address
const createLimiter = ({ windowMs, limit, message, byUser = false, ...options }) => rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...(byUser && { keyGenerator: (req) => req.user.id }),
    handler: (req, res) => {
        res.status(429).json({
            message: `${message} Please try again in ${waitText(req.rateLimit.resetTime - Date.now())}.`
        })
    },
    ...options
})


// all API requests: 300 per 15 minutes per IP
const apiLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 300, message: "Too many requests." })

// login: 10 wrong tries per 15 minutes per IP (correct logins don't count), stops password guessing
const loginLimiter = createLimiter({ windowMs: 15 * MINUTE, limit: 10, message: "Too many wrong login attempts.", skipSuccessfulRequests: true })

// register: 10 accounts per hour per IP
const registerLimiter = createLimiter({ windowMs: HOUR, limit: 10, message: "Too many accounts created from this network." })

// resume and cheat sheet PDFs (they start Chrome on the server): 20 per hour per user
const pdfLimiter = createLimiter({ windowMs: HOUR, limit: 20, message: "Too many PDF downloads.", byUser: true })

// report generation burst guard: 5 per hour per user, failed requests (wrong input, AI error) don't count
const generateLimiter = createLimiter({ windowMs: HOUR, limit: REPORTS_PER_HOUR, message: `You can generate ${REPORTS_PER_HOUR} reports per hour.`, byUser: true, skipFailedRequests: true })


/**
 * @name reportLimit
 * @desc Counts the saved reports of the user in the database, so the hourly and daily limits
 *       still work after the server restarts (Render free sleeps and restarts)
 */
async function reportLimit(req, res, next) {
    const now = Date.now()

    const reportsToday = await interviewReportModel.find({ user: req.user.id, createdAt: { $gte: new Date(now - DAY) } })
        .select("createdAt").sort({ createdAt: 1 }).lean()

    const reportsThisHour = reportsToday.filter(report => report.createdAt.getTime() >= now - HOUR)

    if (reportsThisHour.length >= REPORTS_PER_HOUR) {
        return res.status(429).json({
            message: `You can generate ${REPORTS_PER_HOUR} reports per hour. Please try again in ${waitText(reportsThisHour[0].createdAt.getTime() + HOUR - now)}.`
        })
    }

    if (reportsToday.length >= REPORTS_PER_DAY) {
        return res.status(429).json({
            message: `You can generate ${REPORTS_PER_DAY} reports per day. Please try again in ${waitText(reportsToday[0].createdAt.getTime() + DAY - now)}.`
        })
    }

    next()
}


module.exports = { apiLimiter, loginLimiter, registerLimiter, pdfLimiter, generateLimiter, reportLimit }
