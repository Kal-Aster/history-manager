import express from "express";
import playwright from "playwright";

import createExpressApp from "./createExpressApp.mjs";

const { chromium, firefox, webkit } = playwright;

export default async function openPlaywrightBrowser({
    headless,
    useIndexHTML
}) {
    let app = createExpressApp(useIndexHTML);

    /** @type {playwright.Browser} */
    let browser;
    /** @type {playwright.BrowserContext} */
    let context;

    /** @type {number} */
    let port;
    /** @type {express.Server} */
    let server;
    
    for (let i = 0; i < 100; i++) {
        let tempPort = 81 + i;
        const err = await new Promise(resolve => {
            server = app.listen(tempPort, () => {
                resolve(null);
            }).on("error", err => {
                resolve(err);
            });
        });

        if (err) {
            if (err.message.indexOf("EADDRINUSE") === -1) {
                throw err;
            }
            continue;
        }

        port = server.address().port;
        break;
    }
    
    if (port == void 0) {
        throw new Error("Cannot start express app");
    }
    
    browser = await ({
        chromium, firefox, webkit
    }[process.env.browser || "firefox"] || firefox).launch({
        headless
    });
    context = await browser.newContext({
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true
    });

    return {
        server, port,
        browser, context
    };
}