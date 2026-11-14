const { describe, it, before, after } = require("node:test")
const assert = require("node:assert/strict")
const { startApp, createClient, reportForm, seedReports } = require("./helpers")

const HOUR = 60 * 60 * 1000


describe("rate limits and security", () => {
    let app, api
    const stamp = Date.now()
    const validReport = () => reportForm({ jobDescription: "Node.js developer", selfDescription: "I build APIs" })

    before(async () => {
        app = await startApp()
        api = createClient(app.baseUrl)
    })

    after(async () => {
        await app.stop()
    })

    it("sends security headers and limits the JSON body size", async () => {
        let res = await api.request("GET", "/api/auth/get-me")
        assert.equal(res.headers.get("x-content-type-options"), "nosniff")
        assert.equal(res.headers.get("cross-origin-resource-policy"), "cross-origin")

        res = await api.request("POST", "/api/auth/login", { json: JSON.stringify({ email: "a@example.com", password: "x".repeat(200 * 1024) }) })
        assert.equal(res.status, 413)
    })

    it("stops password guessing after 10 wrong logins, correct logins don't count", async () => {
        const user = await api.register(`login-${stamp}`)
        const ip = "10.200.0.1"
        for (let i = 0; i < 10; i++) {
            await api.request("POST", "/api/auth/login", { ip, json: { email: user.email, password: "wrong" } })
        }
        const res = await api.request("POST", "/api/auth/login", { ip, origin: "http://localhost:4173", json: { email: user.email, password: "wrong" } })
        assert.equal(res.status, 429)
        assert.equal(res.body.message, "Too many wrong login attempts. Please try again in 15 minutes.")
        assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:4173", "the browser can read the 429 message")

        for (let i = 0; i < 12; i++) {
            const ok = await api.request("POST", "/api/auth/login", { ip: "10.200.0.2", json: { email: user.email, password: "Test@12345" } })
            assert.equal(ok.status, 200)
        }
    })

    it("allows 10 new accounts per hour from one IP", async () => {
        const ip = "10.200.0.3"
        for (let i = 0; i < 10; i++) {
            const res = await api.request("POST", "/api/auth/register", { ip, json: { username: `reg-${stamp}-${i}`, email: `reg-${stamp}-${i}@example.com`, password: "Test@12345" } })
            assert.equal(res.status, 201)
        }
        const res = await api.request("POST", "/api/auth/register", { ip, json: { username: `reg-${stamp}-x`, email: `reg-${stamp}-x@example.com`, password: "Test@12345" } })
        assert.equal(res.status, 429)
    })

    it("allows 300 API requests per 15 minutes from one IP", async () => {
        const ip = "10.200.0.4"
        for (let i = 0; i < 300; i++) {
            assert.equal((await api.request("GET", "/api/auth/get-me", { ip })).status, 401)
        }
        assert.equal((await api.request("GET", "/api/auth/get-me", { ip })).status, 429)
    })

    it("allows 5 reports per hour per user, counted from the database", async () => {
        const user = await api.register(`hour-${stamp}`)
        await seedReports(user.id, 5)
        const res = await api.request("POST", "/api/interview", { cookie: user.cookie, form: validReport() })
        assert.equal(res.status, 429)
        assert.equal(res.body.message, "You can generate 5 reports per hour. Please try again in 1 hour.")
    })

    it("allows 20 reports per day per user", async () => {
        const user = await api.register(`day-${stamp}`)
        await seedReports(user.id, 20, { createdAt: new Date(Date.now() - 2 * HOUR) })
        const res = await api.request("POST", "/api/interview", { cookie: user.cookie, form: validReport() })
        assert.equal(res.status, 429)
        assert.match(res.body.message, /^You can generate 20 reports per day/)
    })

    it("creates only 5 reports when 7 are sent at the same time", async () => {
        const user = await api.register(`burst-${stamp}`)
        const results = await Promise.all(Array.from({ length: 7 }, () => api.request("POST", "/api/interview", { cookie: user.cookie, form: validReport() })))
        assert.equal(results.filter(res => res.status === 201).length, 5)
        assert.equal(results.filter(res => res.status === 429).length, 2)
    })

    it("does not count wrong inputs against the report limit", async () => {
        const user = await api.register(`bad-${stamp}`)
        for (let i = 0; i < 6; i++) {
            const res = await api.request("POST", "/api/interview", { cookie: user.cookie, form: reportForm({ selfDescription: "no job description" }) })
            assert.equal(res.status, 400)
        }
        assert.equal((await api.request("POST", "/api/interview", { cookie: user.cookie, form: validReport() })).status, 201)
    })

    it("allows 20 PDFs per hour per user", async () => {
        const user = await api.register(`pdf-${stamp}`)
        const [ id ] = await seedReports(user.id)
        for (let batch = 0; batch < 4; batch++) {
            const results = await Promise.all(Array.from({ length: 5 }, () => api.request("POST", `/api/interview/cheatsheet/pdf/${id}`, { cookie: user.cookie })))
            assert.ok(results.every(res => res.status === 200))
        }
        const res = await api.request("POST", `/api/interview/cheatsheet/pdf/${id}`, { cookie: user.cookie })
        assert.equal(res.status, 429)
        assert.equal(res.body.message, "Too many PDF downloads. Please try again in 1 hour.")
    })
})
