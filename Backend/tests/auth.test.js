const { describe, it, before, after } = require("node:test")
const assert = require("node:assert/strict")
const { startApp, createClient } = require("./helpers")


describe("auth", () => {
    let app, api
    const name = `auth-${Date.now()}`

    before(async () => {
        app = await startApp()
        api = createClient(app.baseUrl)
    })

    after(async () => {
        await app.stop()
    })

    it("registers a new user and sets the login cookie", async () => {
        const res = await api.request("POST", "/api/auth/register", { json: { username: name, email: `${name}@example.com`, password: "Test@12345" } })
        assert.equal(res.status, 201)
        assert.equal(res.body.user.username, name)
        assert.match(res.cookie, /^token=/)
    })

    it("rejects a username or email that already exists", async () => {
        const res = await api.request("POST", "/api/auth/register", { json: { username: name, email: `other-${name}@example.com`, password: "Test@12345" } })
        assert.equal(res.status, 400)
        assert.equal(res.body.message, "User already exists")
    })

    it("rejects an invalid email and a short password", async () => {
        let res = await api.request("POST", "/api/auth/register", { json: { username: `x-${name}`, email: "not-an-email", password: "Test@12345" } })
        assert.equal(res.status, 400)
        assert.equal(res.body.message, "Please enter a valid email")

        res = await api.request("POST", "/api/auth/register", { json: { username: `y-${name}`, email: `y-${name}@example.com`, password: "12345" } })
        assert.equal(res.status, 400)
        assert.equal(res.body.message, "Password must be at least 6 characters")
    })

    it("logs in with the right password only", async () => {
        let res = await api.request("POST", "/api/auth/login", { json: { email: `${name}@example.com`, password: "wrong" } })
        assert.equal(res.status, 400)
        assert.equal(res.body.message, "Invalid credentials")

        res = await api.request("POST", "/api/auth/login", { json: { email: `${name}@example.com`, password: "Test@12345" } })
        assert.equal(res.status, 200)
        assert.match(res.cookie, /^token=/)
    })

    it("returns the logged in user only with a valid token", async () => {
        const { cookie } = await api.register(`me-${name}`)

        let res = await api.request("GET", "/api/auth/get-me", { cookie })
        assert.equal(res.status, 200)
        assert.equal(res.body.user.username, `me-${name}`)

        res = await api.request("GET", "/api/auth/get-me")
        assert.equal(res.status, 401)

        res = await api.request("GET", "/api/auth/get-me", { cookie: "token=not-a-real-token" })
        assert.equal(res.status, 401)
        assert.equal(res.body.message, "Unauthorized")
    })

    it("blacklists the token on logout", async () => {
        const { cookie } = await api.register(`out-${name}`)
        await api.request("GET", "/api/auth/logout", { cookie })

        const res = await api.request("GET", "/api/auth/get-me", { cookie })
        assert.equal(res.status, 401)
        assert.equal(res.body.message, "Token is invalid")
    })
})
