// Browser tests: the real frontend (built with Vite) + the real backend (fake AI, in-memory database) in headless Chrome
const { describe, it, before, after } = require("node:test")
const assert = require("node:assert/strict")
const { spawn, spawnSync } = require("node:child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")
const mongoose = require("mongoose")
const puppeteer = require("puppeteer")
const { startApp, seedReports } = require("../helpers")

const FRONTEND = path.join(__dirname, "../../../Frontend")
const VITE = path.join(FRONTEND, "node_modules/vite/bin/vite.js")
const PORT = 4173
const APP = `http://localhost:${PORT}`

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function waitForUrl(url, tries = 60) {
    for (let i = 0; i < tries; i++) {
        try {
            if ((await fetch(url)).ok) return
        } catch {
            // not started yet
        }
        await wait(500)
    }
    throw new Error(`${url} did not start`)
}


describe("app in the browser", () => {
    let backend, preview, browser, page, outDir, downloadDir
    const alerts = []
    const pageErrors = []
    const name = `e2e-${Date.now()}`
    const email = `${name}@example.com`
    let reportId

    const lastAlert = () => alerts[alerts.length - 1]
    const text = (selector) => page.$eval(selector, el => el.textContent.trim())
    const clickText = async (tag, label) => {
        const [ element ] = await page.$$(`xpath/.//${tag}[contains(., "${label}")]`)
        await element.click()
    }

    before(async () => {
        backend = await startApp({ clientUrl: APP })

        // build the frontend against this backend and serve it like Netlify does
        outDir = fs.mkdtempSync(path.join(os.tmpdir(), "genai-e2e-"))
        const build = spawnSync(process.execPath, [ VITE, "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error" ], {
            cwd: FRONTEND,
            env: { ...process.env, NODE_ENV: "production", VITE_API_URL: backend.baseUrl }
        })
        assert.equal(build.status, 0, String(build.stderr))
        preview = spawn(process.execPath, [ VITE, "preview", "--outDir", outDir, "--port", String(PORT), "--strictPort" ], { cwd: FRONTEND })
        await waitForUrl(APP)

        browser = await puppeteer.launch()
        page = await browser.newPage()
        await page.setViewport({ width: 1280, height: 900 })
        page.on("dialog", async dialog => { alerts.push(dialog.message()); await dialog.accept() })
        page.on("pageerror", error => pageErrors.push(error.message))

        downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), "genai-e2e-downloads-"))
        const cdp = await page.createCDPSession()
        await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir })
    })

    after(async () => {
        await browser?.close()
        preview?.kill()
        await backend?.stop()
        fs.rmSync(outDir, { recursive: true, force: true })
        fs.rmSync(downloadDir, { recursive: true, force: true })
    })

    it("registers and opens Home", async () => {
        await page.goto(`${APP}/register`, { waitUntil: "networkidle0" })
        await page.type("#username", name)
        await page.type("#email", email)
        await page.type("#password", "Test@12345")
        await page.click("button.primary-button")
        await page.waitForSelector(".panel--left .panel__textarea")
    })

    it("checks the inputs before sending", async () => {
        await page.click(".generate-btn")
        await wait(200)
        assert.equal(lastAlert(), "Please paste the job description")
    })

    it("generates a report and opens it", async () => {
        const jobDescription = "Backend Engineer (Node.js) with PostgreSQL and Docker"
        await page.type(".panel--left .panel__textarea", jobDescription)
        assert.equal(await text(".char-counter"), `${jobDescription.length} / 5000 chars`)
        await page.type("#selfDescription", "2 years of React and Node")
        await page.click(".generate-btn")
        await page.waitForSelector(".interview-page", { timeout: 15000 })
        reportId = page.url().split("/interview/")[1]
        assert.ok(reportId)
    })

    it("ticks a road map task and keeps it after a reload", async () => {
        await clickText("button", "Road Map")
        await page.click(".roadmap-day__check input")
        await page.waitForNetworkIdle()
        assert.match(await text(".plan-progress__text"), /^1 of \d+ tasks done/)

        await page.reload({ waitUntil: "networkidle0" })
        await page.waitForSelector(".interview-page")
        await clickText("button", "Road Map")
        assert.equal(await page.$eval(".roadmap-day__check input", el => el.checked), true)
    })

    it("turns a sure-but-wrong answer into a blind spot", async () => {
        await clickText("button", "Technical Questions")
        await page.click(".q-card__header")
        assert.ok(await page.$(".q-card__confidence"), "asks how sure before showing the answer")
        const levels = await page.$$(".q-card__level")
        await levels[4].click()
        await clickText("button", "I didn't")
        await page.waitForNetworkIdle()
        assert.equal(await text(".q-card__status"), "Revise")
        assert.equal((await page.$$(".blind-spots__list li")).length, 1)
    })

    it("downloads the cheat sheet", async () => {
        await clickText("button", "Cheat Sheet")
        let file
        for (let i = 0; i < 40 && !file; i++) {
            await wait(250)
            file = fs.readdirSync(downloadDir).find(f => f.endsWith(".pdf"))
        }
        assert.equal(file, `cheatsheet_${reportId}.pdf`)
    })

    it("shows the reports, progress and gap radar on Home", async () => {
        const user = await mongoose.connection.collection("users").findOne({ email })
        await seedReports(user._id.toString(), 1, { skillGaps: [ { skill: "Docker", severity: "high" } ] })

        await page.goto(APP, { waitUntil: "networkidle0" })
        await page.waitForSelector(".gap-radar")
        assert.equal((await page.$$(".report-item")).length, 2)
        assert.match(await text(".gap-radar__row"), /Docker/)
        const progress = await page.$$eval(".report-progress", els => els.map(el => el.textContent))
        assert.ok(progress.some(line => line !== "Prep Progress: 0%"))
    })

    it("deletes a report after confirming", async () => {
        await page.click(".report-item__delete")
        await page.waitForNetworkIdle()
        await wait(200)
        assert.equal((await page.$$(".report-item")).length, 1)
        assert.equal(page.url(), `${APP}/`, "deleting does not open the report")
    })

    it("shows 'not found' for an unknown report", async () => {
        await page.goto(`${APP}/interview/${new mongoose.Types.ObjectId()}`, { waitUntil: "networkidle0" })
        await page.waitForFunction(() => document.body.innerText.includes("not found"))
        assert.equal(await text(".loader__title"), "Interview report not found")
        assert.ok(await page.$("xpath/.//a[contains(., 'Go back home')]"), "has a way back home")
    })

    it("works on a phone", async () => {
        await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true })
        await page.goto(APP, { waitUntil: "networkidle0" })
        await page.waitForSelector(".panel")
        const panelWidths = await page.$$eval(".panel", els => els.map(el => el.getBoundingClientRect().width))
        assert.ok(panelWidths.every(width => width > 300), "panels are stacked full width")
        assert.equal(await page.$eval(".panel__textarea", el => getComputedStyle(el).fontSize), "16px")

        await page.goto(`${APP}/interview/${reportId}`, { waitUntil: "networkidle0" })
        await page.waitForSelector(".interview-page")
        assert.equal(await page.$eval(".nav-content", el => getComputedStyle(el).flexDirection), "row")
        await page.setViewport({ width: 1280, height: 900 })
    })

    it("shows the server's reason after a wrong password and keeps the email", async () => {
        await page.goto(APP, { waitUntil: "networkidle0" })
        await page.click(".logout-btn")
        await page.waitForSelector(".form-container")
        await page.type("#email", email)
        await page.type("#password", "wrong-password")
        await page.click("button.primary-button")
        await wait(1000)
        assert.equal(lastAlert(), "Invalid credentials")
        assert.equal(await page.$eval("#email", el => el.value), email)
    })

    it("had no JavaScript errors", () => {
        assert.deepEqual(pageErrors, [])
    })
})
