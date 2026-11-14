const { describe, it, before, after } = require("node:test")
const assert = require("node:assert/strict")
const path = require("path")
const { MongoMemoryServer } = require("mongodb-memory-server-core")
const mongoose = require("mongoose")
const sampleReport = require("./sample-report.json")
const candidate = require("./sample-candidate")


// tests the Gemini safety layer with a fake Gemini client: nothing is sent to Google
describe("ai service: free Gemini quota guard", () => {
    let mongo, generateInterviewReport
    let googleCalls = 0
    let mode = "ok"

    before(async () => {
        mongo = await MongoMemoryServer.create()
        await mongoose.connect(mongo.getUri("ai-test"))
        process.env.GEMINI_DAILY_LIMIT = "2"
        process.env.GOOGLE_GENAI_API_KEY = "fake-key-not-used"

        // replace the Gemini client, loaded from the same file the service uses
        const genaiPath = require.resolve("@google/genai", { paths: [ path.join(__dirname, "../src/services") ] })
        const genai = require(genaiPath)
        class FakeGoogleGenAI {
            constructor() {
                this.models = {
                    generateContent: async () => {
                        googleCalls += 1
                        if (mode === "google-limit") throw new genai.ApiError({ message: "RESOURCE_EXHAUSTED", status: 429 })
                        return { text: JSON.stringify(sampleReport) }
                    }
                }
            }
        }
        require.cache[genaiPath].exports = { ...genai, GoogleGenAI: FakeGoogleGenAI }

        ;({ generateInterviewReport } = require("../src/services/ai.service"))
    })

    after(async () => {
        await mongoose.disconnect()
        await mongo.stop()
    })

    it("returns the validated report while under the daily limit", async () => {
        const report = await generateInterviewReport(candidate)
        assert.equal(report.preparationPlan.length, 7)
        await generateInterviewReport(candidate)
        assert.equal(googleCalls, 2)
    })

    it("stops before calling Google when the daily limit is used up", async () => {
        await assert.rejects(generateInterviewReport(candidate), {
            status: 429,
            message: "The free AI limit for today is used up, please try again tomorrow"
        })
        assert.equal(googleCalls, 2, "Google was not called")
    })

    it("counts calls per Pacific-time day in MongoDB and cleans up old days", async () => {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
        const usage = await mongoose.connection.collection("aiusages").findOne({ date: today })
        assert.equal(usage.count, 3)

        await mongoose.model("aiUsage").init()
        const indexes = await mongoose.connection.collection("aiusages").indexes()
        assert.ok(indexes.some(index => index.key.date === 1 && index.unique))
        assert.equal(indexes.find(index => index.key.createdAt === 1).expireAfterSeconds, 7 * 24 * 60 * 60)
    })

    it("turns Google's own limit error into a friendly message", async () => {
        await mongoose.connection.collection("aiusages").deleteMany({})
        mode = "google-limit"
        await assert.rejects(generateInterviewReport(candidate), {
            status: 429,
            message: "The free AI limit is reached right now, please try again later"
        })
    })
})
