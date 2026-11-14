const { MongoMemoryServer } = require("mongodb-memory-server-core")
const mongoose = require("mongoose")
const sampleReport = require("./sample-report.json")


/**
 * @name useFakeAi
 * @desc Replaces the Gemini service with a fake one, so the tests never need the API key or use the free quota
 */
function useFakeAi() {
    const servicePath = require.resolve("../src/services/ai.service")
    require.cache[servicePath] = {
        id: servicePath,
        filename: servicePath,
        loaded: true,
        exports: {
            generateInterviewReport: async () => structuredClone(sampleReport),
            generateResumeHtml: async () => "<h1>Arjun Mehta</h1><p>Test resume</p>"
        }
    }
}


/**
 * @name startApp
 * @desc Starts the real Express app on a free port with an in-memory MongoDB (nothing touches Atlas)
 */
async function startApp({ fakeAi = true, clientUrl = "http://localhost:4173" } = {}) {
    const mongo = await MongoMemoryServer.create()

    process.env.JWT_SECRET = "test-secret"
    process.env.NODE_ENV = "test"
    process.env.CLIENT_URL = clientUrl
    process.env.GEMINI_DAILY_LIMIT = process.env.GEMINI_DAILY_LIMIT || "1000"

    if (fakeAi) useFakeAi()

    await mongoose.connect(mongo.getUri("genai-test"))
    const app = require("../src/app")
    const server = app.listen(0)
    await new Promise(resolve => server.once("listening", resolve))

    return {
        baseUrl: `http://localhost:${server.address().port}`,
        stop: async () => {
            await new Promise(resolve => server.close(resolve))
            await mongoose.disconnect()
            await mongo.stop()
        }
    }
}


// every request gets its own visitor IP (the app trusts 1 proxy), so the IP rate limits of one test don't affect another
let ipCounter = 0
const nextIp = () => {
    ipCounter += 1
    return `10.${Math.floor(ipCounter / 65025) % 255}.${Math.floor(ipCounter / 255) % 255}.${ipCounter % 255}`
}


/**
 * @name createClient
 * @desc Small helpers to call the API like the frontend does
 */
function createClient(baseUrl) {

    async function request(method, path, { json, form, cookie, ip = nextIp(), origin } = {}) {
        const headers = { "x-forwarded-for": ip }
        if (cookie) headers.cookie = cookie
        if (origin) headers.origin = origin

        let body
        if (json !== undefined) {
            headers["content-type"] = "application/json"
            body = typeof json === "string" ? json : JSON.stringify(json)
        }
        if (form) body = form

        const res = await fetch(baseUrl + path, { method, headers, body })
        const type = res.headers.get("content-type") || ""
        const data = type.includes("json") ? await res.json() : Buffer.from(await res.arrayBuffer())

        return { status: res.status, body: data, headers: res.headers, cookie: res.headers.getSetCookie()[0]?.split(";")[0] }
    }

    async function register(name, { ip } = {}) {
        const email = `${name}@example.com`
        const res = await request("POST", "/api/auth/register", { json: { username: name, email, password: "Test@12345" }, ip })
        return { email, cookie: res.cookie, id: res.body.user?.id }
    }

    return { request, register }
}


// form data for POST /api/interview, file is { buffer, name, type }
function reportForm({ jobDescription, selfDescription, file } = {}) {
    const form = new FormData()
    if (jobDescription) form.append("jobDescription", jobDescription)
    if (selfDescription) form.append("selfDescription", selfDescription)
    if (file) form.append("resume", new Blob([ file.buffer ], { type: file.type }), file.name)
    return form
}


/**
 * @name seedReports
 * @desc Saves reports straight into the database (no AI), createdAt can be set to test the time limits
 */
async function seedReports(userId, count = 1, { createdAt = new Date(), ...overrides } = {}) {
    const docs = Array.from({ length: count }, () => ({
        ...structuredClone(sampleReport),
        jobDescription: "Backend Engineer (Node.js)",
        resume: require("./sample-candidate").resume,
        ...overrides,
        user: new mongoose.Types.ObjectId(userId),
        createdAt,
        updatedAt: createdAt
    }))
    const { insertedIds } = await mongoose.connection.collection("interviewreports").insertMany(docs)
    return Object.values(insertedIds).map(String)
}


module.exports = { startApp, createClient, reportForm, seedReports, useFakeAi, sampleReport }
