const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const helmet = require("helmet")
const { apiLimiter } = require("./middleware/rateLimit.middleware")

const app = express()

// Render has one proxy in front of the app, this gives the real visitor IP to the rate limits
app.set("trust proxy", 1)

// security headers, cross-origin is allowed so the Netlify frontend can still download the PDFs
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(cookieParser())
app.use(express.json({ limit: "100kb" }))
app.use(cors({
    origin: process.env.CLIENT_URL || "https://interviewtrained.netlify.app",  // frontend URL from env, deployed frontend URL as fallback
    credentials: true
}))

// after cors, so the "too many requests" message also reaches the browser
app.use("/api", apiLimiter)

// require all the routes here
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

/**
 * @route GET /api/health
 * @desc Health check used by the keep-awake ping (GitHub Actions), no database and no login
 * @access Public
 */
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})

//using all the routes here
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

// error handler: sends every error as JSON instead of the default HTML error page
app.use((err, req, res, next) => {
    if (err.name === "MulterError") {
        const message = err.code === "LIMIT_FILE_SIZE" ? "Resume must be 3MB or smaller" : err.message
        return res.status(400).json({ message })
    }

    if (err.name === "CastError") {
        return res.status(400).json({ message: "Invalid ID" })
    }

    // only real server errors are logged, client errors (too large, rate limited, ...) are normal
    if (!err.status || err.status >= 500) console.error(err)
    res.status(err.status || 500).json({
        message: err.status ? err.message : "Something went wrong, please try again"
    })
})

module.exports = app