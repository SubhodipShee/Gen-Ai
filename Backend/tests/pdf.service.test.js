const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { PDFParse } = require("pdf-parse")
const { generatePdfFromHtml, buildCheatSheetHtml } = require("../src/services/pdf.service")
const sampleReport = require("./sample-report.json")
const candidate = require("./sample-candidate")

const pdfText = async (buffer) => (await new PDFParse(Uint8Array.from(buffer)).getText()).text


describe("pdf service", () => {
    it("does not run scripts inside the html", async () => {
        const text = await pdfText(await generatePdfFromHtml(`<p id="a">BEFORE</p><script>document.getElementById("a").textContent = "SCRIPT-RAN"</script>`))
        assert.match(text, /BEFORE/)
        assert.doesNotMatch(text, /SCRIPT-RAN/)
    })

    it("builds a one page cheat sheet with numbers, stories, gaps and the plan", async () => {
        const report = { ...structuredClone(sampleReport), resume: candidate.resume }
        report.technicalQuestions[0].confidence = 5
        report.technicalQuestions[0].knewIt = false

        const pdf = await generatePdfFromHtml(buildCheatSheetHtml(report))
        const text = (await pdfText(pdf)).toUpperCase()
        for (const part of [ "YOUR NUMBERS TO MENTION", "40,000", "35%", "3 STORIES TO TELL", "GAPS TO BE READY FOR", "BLIND SPOTS", "DAY 1:" ]) {
            assert.ok(text.includes(part), `cheat sheet should include "${part}"`)
        }
        const pages = (Buffer.from(pdf).toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length
        assert.equal(pages, 1)
    })

    it("shows html inside report text as text", () => {
        const html = buildCheatSheetHtml({ ...structuredClone(sampleReport), title: `<script>alert(1)</script>` })
        assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"))
        assert.ok(!html.includes("<script>alert(1)</script>"))
    })
})
