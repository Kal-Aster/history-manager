import openPlaywrightBrowser from "./openPlaywrightBrowser.mjs";
import startRouter from "./startRouter.mjs";

import { exit } from "node:process";

(async () => {
    const {
        server, port,
        browser, context
    } = await openPlaywrightBrowser({
        headless: false,
        useIndexHTML: true
    });
    browser.on("disconnected", () => {
        server.close(() => {
            exit(0);
        });
    });
    
    const page = await context.newPage();
    setInterval(() => {
        const contexts = browser.contexts();
        if (
            contexts.length > 0 &&
            contexts.some(context => context.pages().length > 0)
        ) {
            return;
        }
        browser.close();
    }, 1000);

    await page.goto(`http://localhost:${port}/`);
})();