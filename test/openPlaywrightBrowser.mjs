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
    
    const BASE_PORT = 5000;
    const MAX_ATTEMPTS = 100;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const tempPort = BASE_PORT + i;
        const err = await new Promise(resolve => {
            server = app.listen(tempPort, () => {
                resolve(null);
            }).on("error", err => {
                resolve(err);
            });
        });

        if (err) {
            // Port already in use or not bindable: move on to the next one.
            if (err.code === "EADDRINUSE" || err.code === "EACCES") {
                continue;
            }
            throw err;
        }

        // The bound port is exposed to the caller (and, through it, to the
        // tests) via `port` in the returned object.
        port = server.address().port;
        break;
    }

    if (port == void 0) {
        throw new Error(
            `Cannot start express app: no free port in ` +
            `${BASE_PORT}-${BASE_PORT + MAX_ATTEMPTS - 1}`
        );
    }
    
    browser = await ({
        chromium, firefox, webkit
    }[process.env.BROWSER || "firefox"] || firefox).launch({
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