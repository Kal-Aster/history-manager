const express = require("express");

const { readFileSync } = require("fs");
const { join } = require("path");

function createExpressApp() {
    const app = express();

    app.get("/index.js", (req, res) => {
        res.send(
            readFileSync(join(__dirname, "..", "dist", "index.js"))
        );
    });
    app.get("/*", (req, res) => {
        res.send(
            `<!DOCTYPE html>\n` +
            `<html>\n` +
            `    <head>\n` +
            `        <meta name="format-detection" content="telephone=no">\n` +
            `        <meta name="msapplication-tap-highlight" content="no">\n` +
            `        <meta name="viewport" content="initial-scale=1, width=device-width, viewport-fit=cover">\n` +
            `        <meta charset="utf-8">\n` +
            `        <title>history-manager - test page</title>\n` +
            `    </head>\n` +
            `    <body>\n` +
            `        <script src="/index.js"></script>\n` +
            `    </body>\n` +
            `</html>`
        );
    });

    return app;
}
module.exports = createExpressApp;