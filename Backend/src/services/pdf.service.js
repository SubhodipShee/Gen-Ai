const puppeteer = require("puppeteer");


// starts Chrome; some hosts (like Render) do not allow Chrome's sandbox, then it starts without it
// (that is safe here because JavaScript is turned off for every page we render)
const launchBrowser = async () => {
  try {
    return await puppeteer.launch();
  } catch (error) {
    if (!/sandbox/i.test(error.message)) throw error;
    console.warn("Chrome sandbox is not available on this server, starting Chrome without it");
    return puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  }
};

// using puppeteer to turn html into an A4 pdf

const generatePdfFromHtml = async (htmlContent) => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // the html contains text from resumes and AI, so no script inside it is allowed to run on the server
    await page.setJavaScriptEnabled(false);
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({format:"A4",margin:{top:"20mm",bottom:"20mm",left:"15mm",right:"15mm"}});
    return pdfBuffer;
  } finally {
    // always close chrome, even on error, so it does not stay in memory on the server
    await browser.close();
  }
}

// makes user and AI text safe to put inside html
const escapeHtml = (text = "") =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// first sentences of a long answer, so it fits on the cheat sheet
const shortenText = (text = "", maxLength = 260) => {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSentenceEnd = cut.lastIndexOf(". ");
  return (lastSentenceEnd > 80 ? cut.slice(0, lastSentenceEnd + 1) : cut.trim() + "…");
};

// resume lines with numbers worth saying out loud, like "40,000 users", "35%", "team of 3"
const findResumeNumbers = (resume = "") => {
  const numberPattern = /\d+(\.\d+)?\s*(%|\+|x\b|k\b)|\d{1,3}(,\d{3})+|\b\d+\s+(users|customers|clients|people|developers|engineers|members|weeks|months|projects|requests|servers|countries)\b|team of \d+/i;

  return resume
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-•*·]+/, "").trim())
    .filter((line) => line.length > 15 && numberPattern.test(line))
    .slice(0, 5);
};

// builds the one page interview cheat sheet only from data already saved on the report (no AI call)

const buildCheatSheetHtml = (interviewReport) => {
  const { title, matchScore, resume, skillGaps = [], technicalQuestions = [], behavioralQuestions = [], preparationPlan = [] } = interviewReport;

  const numbers = findResumeNumbers(resume);
  const gaps = skillGaps.filter((gap) => gap.severity !== "low");
  const blindSpots = [...technicalQuestions, ...behavioralQuestions]
    .filter((q) => q.confidence >= 4 && q.knewIt === false)
    .slice(0, 3);
  const stories = behavioralQuestions.slice(0, 3);
  const topics = technicalQuestions.slice(0, 8);

  const list = (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  const section = (heading, body) => `<section><h2>${heading}</h2>${body}</section>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2328; background: #ffffff; font-size: 10.5px; line-height: 1.45; margin: 0; }
  header { border-bottom: 2px solid #06ab3b; padding-bottom: 6px; margin-bottom: 10px; }
  header h1 { font-size: 18px; margin: 0; color: #06ab3b; }
  header p { margin: 2px 0 0; color: #57606a; }
  .columns { display: flex; gap: 16px; }
  .column { flex: 1; min-width: 0; }
  section { margin-bottom: 10px; break-inside: avoid; }
  h2 { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #06ab3b; margin: 0 0 4px; }
  ul { margin: 0; padding-left: 14px; }
  li { margin-bottom: 3px; }
  .story { margin-bottom: 6px; }
  .story b { display: block; }
  .tag { display: inline-block; border: 1px solid #d0d7de; border-radius: 10px; padding: 1px 7px; margin: 0 4px 4px 0; }
  .tag.high { border-color: #ff4d4d; color: #cf222e; }
  .tag.medium { border-color: #f5a623; color: #9a6700; }
  .muted { color: #57606a; }
</style>
</head>
<body>
  <header>
    <h1>Interview Cheat Sheet</h1>
    <p><b>${escapeHtml(title)}</b> · Match score ${escapeHtml(matchScore)}%</p>
  </header>
  <div class="columns">
    <div class="column">
      ${numbers.length ? section("Your numbers to mention", list(numbers.map(escapeHtml))) : ""}
      ${stories.length ? section("3 stories to tell (STAR)", stories.map((q) => `<div class="story"><b>${escapeHtml(q.question)}</b><span class="muted">${escapeHtml(shortenText(q.answer))}</span></div>`).join("")) : ""}
      ${blindSpots.length ? section("Your blind spots, read these again", list(blindSpots.map((q) => escapeHtml(q.question)))) : ""}
    </div>
    <div class="column">
      ${gaps.length ? section("Gaps to be ready for", gaps.map((gap) => `<span class="tag ${gap.severity}">${escapeHtml(gap.skill)}</span>`).join("")) : ""}
      ${topics.length ? section("Technical topics they may ask", list(topics.map((q) => escapeHtml(q.question)))) : ""}
      ${preparationPlan.length ? section("7-day plan at a glance", list(preparationPlan.map((day) => `<b>Day ${escapeHtml(day.day)}:</b> ${escapeHtml(day.focus)}`))) : ""}
    </div>
  </div>
</body>
</html>`;
};

module.exports = { generatePdfFromHtml, buildCheatSheetHtml };
