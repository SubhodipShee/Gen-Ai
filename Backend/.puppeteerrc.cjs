const { join } = require("path")

/**
 * Puppeteer keeps its Chrome inside the project (Backend/.cache/puppeteer) instead of $HOME/.cache,
 * because Render does not keep $HOME/.cache from the build, then the PDFs fail with "Could not find Chrome".
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    cacheDirectory: join(__dirname, ".cache", "puppeteer"),
}
