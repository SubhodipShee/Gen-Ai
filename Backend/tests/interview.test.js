const { describe, it, before, after } = require("node:test")
const assert = require("node:assert/strict")
const mongoose = require("mongoose")
const { PDFParse } = require("pdf-parse")
const { startApp, createClient, reportForm, seedReports, sampleReport } = require("./helpers")
const { generatePdfFromHtml } = require("../src/services/pdf.service")
const candidate = require("./sample-candidate")

const pdfText = async (buffer) => (await new PDFParse(Uint8Array.from(buffer)).getText()).text
const isPdf = (buffer) => Buffer.isBuffer(buffer) && buffer.subarray(0, 4).toString() === "%PDF"


describe("interview reports", () => {
    let app, api, owner, other, resumePdf
    const stamp = Date.now()

    before(async () => {
        app = await startApp()
        api = createClient(app.baseUrl)
        owner = await api.register(`owner-${stamp}`)
        other = await api.register(`other-${stamp}`)
        resumePdf = await generatePdfFromHtml(`<pre>${candidate.resume}</pre>`)
    })

    after(async () => {
        await app.stop()
    })

    describe("generate", () => {
        it("needs a job description", async () => {
            const res = await api.request("POST", "/api/interview", { cookie: owner.cookie, form: reportForm({ selfDescription: "I code" }) })
            assert.equal(res.status, 400)
            assert.equal(res.body.message, "Job description is required")
        })

        it("needs a resume or a self description", async () => {
            const res = await api.request("POST", "/api/interview", { cookie: owner.cookie, form: reportForm({ jobDescription: candidate.jobDescription }) })
            assert.equal(res.status, 400)
            assert.equal(res.body.message, "Please upload a resume or add a self description")
        })

        it("only accepts PDF files up to 3MB", async () => {
            let res = await api.request("POST", "/api/interview", { cookie: owner.cookie, form: reportForm({ jobDescription: "x", file: { buffer: Buffer.from("not a pdf"), name: "a.txt", type: "text/plain" } }) })
            assert.equal(res.status, 400)
            assert.equal(res.body.message, "Only PDF files are allowed")

            res = await api.request("POST", "/api/interview", { cookie: owner.cookie, form: reportForm({ jobDescription: "x", file: { buffer: Buffer.alloc(4 * 1024 * 1024), name: "big.pdf", type: "application/pdf" } }) })
            assert.equal(res.status, 400)
            assert.equal(res.body.message, "Resume must be 3MB or smaller")
        })

        it("creates a report from a resume PDF, with tasks in every plan day", async () => {
            const res = await api.request("POST", "/api/interview", { cookie: owner.cookie, form: reportForm({ jobDescription: candidate.jobDescription, file: { buffer: resumePdf, name: "resume.pdf", type: "application/pdf" } }) })
            assert.equal(res.status, 201)
            assert.match(res.body.interviewReport.resume, /BrightCart/)
            assert.equal(res.body.interviewReport.preparationPlan.length, 7)
            assert.ok(res.body.interviewReport.preparationPlan.every(day => day.tasks.length > 0))
        })

        it("creates a report from a self description only", async () => {
            const res = await api.request("POST", "/api/interview", { cookie: owner.cookie, form: reportForm({ jobDescription: candidate.jobDescription, selfDescription: candidate.selfDescription }) })
            assert.equal(res.status, 201)
            assert.equal(res.body.interviewReport.resume, "")
        })
    })

    describe("read and delete", () => {
        it("lists only the user's reports, without the big fields", async () => {
            const res = await api.request("GET", "/api/interview", { cookie: owner.cookie })
            assert.equal(res.status, 200)
            assert.equal(res.body.interviewReports.length, 2)
            for (const field of [ "resume", "technicalQuestions", "resumeHtml" ]) {
                assert.ok(!(field in res.body.interviewReports[0]), `${field} should not be in the list`)
            }
        })

        it("returns one report only to its owner", async () => {
            const [ id ] = await seedReports(owner.id)
            assert.equal((await api.request("GET", `/api/interview/report/${id}`, { cookie: owner.cookie })).status, 200)
            assert.equal((await api.request("GET", `/api/interview/report/${id}`, { cookie: other.cookie })).status, 404)
        })

        it("answers 400 for an invalid id and 404 for an unknown one", async () => {
            let res = await api.request("GET", "/api/interview/report/not-an-id", { cookie: owner.cookie })
            assert.equal(res.status, 400)
            assert.equal(res.body.message, "Invalid ID")
            res = await api.request("GET", `/api/interview/report/${new mongoose.Types.ObjectId()}`, { cookie: owner.cookie })
            assert.equal(res.status, 404)
        })

        it("deletes a report only for its owner", async () => {
            const [ id ] = await seedReports(owner.id)
            assert.equal((await api.request("DELETE", `/api/interview/report/${id}`, { cookie: other.cookie })).status, 404)
            assert.equal((await api.request("DELETE", `/api/interview/report/${id}`, { cookie: owner.cookie })).status, 200)
            assert.equal((await api.request("GET", `/api/interview/report/${id}`, { cookie: owner.cookie })).status, 404)
        })
    })

    describe("plan progress", () => {
        it("ticks and unticks tasks and updates the percentage", async () => {
            const [ id ] = await seedReports(owner.id)
            const totalTasks = sampleReport.preparationPlan.reduce((sum, day) => sum + day.tasks.length, 0)
            const path = `/api/interview/report/${id}/progress`

            let res = await api.request("PATCH", path, { cookie: owner.cookie, json: { dayIndex: 0, taskIndex: 1, done: true } })
            assert.equal(res.status, 200)
            assert.deepEqual(res.body.preparationPlan[0].completedTasks, [ 1 ])
            assert.equal(res.body.progress, Math.round(100 / totalTasks))

            res = await api.request("PATCH", path, { cookie: owner.cookie, json: { dayIndex: 0, taskIndex: 1, done: true } })
            assert.deepEqual(res.body.preparationPlan[0].completedTasks, [ 1 ], "the same task is not counted twice")

            res = await api.request("PATCH", path, { cookie: owner.cookie, json: { dayIndex: 0, taskIndex: 1, done: false } })
            assert.deepEqual(res.body.preparationPlan[0].completedTasks, [])
            assert.equal(res.body.progress, 0)
        })

        it("rejects bad input and other users", async () => {
            const [ id ] = await seedReports(owner.id)
            const path = `/api/interview/report/${id}/progress`
            assert.equal((await api.request("PATCH", path, { cookie: owner.cookie, json: { dayIndex: "0", taskIndex: 1 } })).status, 400)
            assert.equal((await api.request("PATCH", path, { cookie: owner.cookie, json: { dayIndex: 0, taskIndex: 99, done: true } })).status, 400)
            assert.equal((await api.request("PATCH", path, { cookie: other.cookie, json: { dayIndex: 0, taskIndex: 0, done: true } })).status, 404)
        })
    })

    describe("confidence check", () => {
        const DAY = 24 * 60 * 60 * 1000
        const daysFromNow = (date) => Math.round((new Date(date) - Date.now()) / DAY)

        it("schedules the next revision: 1 day, then 3, then 7", async () => {
            const [ id ] = await seedReports(owner.id)
            const review = (json) => api.request("PATCH", `/api/interview/report/${id}/question`, { cookie: owner.cookie, json })

            let res = await review({ type: "technical", index: 0, confidence: 5, knewIt: false })
            assert.equal(res.body.question.box, 0)
            assert.equal(daysFromNow(res.body.question.nextReviewAt), 1)

            res = await review({ type: "technical", index: 0, confidence: 3, knewIt: true })
            assert.equal(res.body.question.box, 1)
            assert.equal(daysFromNow(res.body.question.nextReviewAt), 3)

            res = await review({ type: "technical", index: 0, knewIt: true })
            assert.equal(res.body.question.box, 2)
            assert.equal(daysFromNow(res.body.question.nextReviewAt), 7)
            assert.equal(res.body.question.confidence, null)
        })

        it("rejects bad input", async () => {
            const [ id ] = await seedReports(owner.id)
            const review = (json, cookie = owner.cookie) => api.request("PATCH", `/api/interview/report/${id}/question`, { cookie, json })
            assert.equal((await review({ type: "other", index: 0, knewIt: true })).status, 400)
            assert.equal((await review({ type: "technical", index: 0, confidence: 6, knewIt: true })).status, 400)
            assert.equal((await review({ type: "technical", index: 99, knewIt: true })).status, 400)
            assert.equal((await review({ type: "technical", index: 0, knewIt: true }, other.cookie)).status, 404)
        })
    })

    describe("career gap radar", () => {
        it("groups the same skill across reports and keeps the highest severity", async () => {
            const user = await api.register(`radar-${stamp}`)
            await seedReports(user.id, 2)
            await seedReports(user.id, 1, { skillGaps: [ { skill: "  typescript ", severity: "low" }, { skill: "Rust", severity: "high" } ] })

            const res = await api.request("GET", "/api/interview/insights", { cookie: user.cookie })
            assert.equal(res.body.totalReports, 3)
            assert.deepEqual(res.body.skillGaps[0], { skill: "TypeScript", jobCount: 3, severity: "high" })
            assert.ok(res.body.skillGaps.length <= 6)
        })

        it("is empty for a user without reports", async () => {
            const user = await api.register(`empty-${stamp}`)
            const res = await api.request("GET", "/api/interview/insights", { cookie: user.cookie })
            assert.deepEqual(res.body, { message: "Interview insights retrieved successfully", totalReports: 0, skillGaps: [] })
        })
    })

    describe("PDFs", () => {
        it("makes the cheat sheet PDF from the saved report, only for the owner", async () => {
            const [ id ] = await seedReports(owner.id)
            let res = await api.request("POST", `/api/interview/cheatsheet/pdf/${id}`, { cookie: owner.cookie })
            assert.equal(res.status, 200)
            assert.ok(isPdf(res.body))
            const text = await pdfText(res.body)
            assert.match(text, /40,000/)
            assert.match(text, /Day 1:/)

            res = await api.request("POST", `/api/interview/cheatsheet/pdf/${id}`, { cookie: other.cookie })
            assert.equal(res.status, 404)
        })

        it("makes the resume PDF with AI once, then reuses the saved html", async () => {
            const [ id ] = await seedReports(owner.id)
            let res = await api.request("POST", `/api/interview/resume/pdf/${id}`, { cookie: owner.cookie })
            assert.equal(res.status, 200)
            assert.ok(isPdf(res.body))

            const saved = await mongoose.connection.collection("interviewreports").findOne({ _id: new mongoose.Types.ObjectId(id) })
            assert.match(saved.resumeHtml, /Arjun Mehta/)

            res = await api.request("POST", `/api/interview/resume/pdf/${id}`, { cookie: other.cookie })
            assert.equal(res.status, 404)
        })
    })
})
