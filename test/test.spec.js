const express = require("express");
const playwright = require("playwright");

const { expect } = require("chai");

const createExpressApp = require("./createExpressApp");
const startRouter = require("./startRouter");

const { chromium, firefox, webkit } = playwright;

describe("Router", function () {
    this.timeout(20000);

    /** @type {pw.Browser} */
    let browser;
    /** @type {pw.BrowserContext} */
    let context;
    /** @type {pw.Page} */
    let page;

    /** @type {number} */
    let port;
    /** @type {express.Server} */
    let server;

    before(async () => {
        let app = createExpressApp();

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
            headless: true
        });
        context = await browser.newContext({
            ignoreHTTPSErrors: true,
            javaScriptEnabled: true
        });
    });
    after(async () => {
        server.close();
        if (!context) {
            return;
        }
        await context.close();
        await browser.close();
    });

    beforeEach(async () => {
        page = await context.newPage();
    });
    afterEach(async () => {
        await page.close();
    });

    it("should work", async () => {
        await page.goto(`http://localhost:${port}/`);
        await startRouter(page);
    });

    it("can have contexts", async () => {
        await page.goto(`http://localhost:${port}/`);
        await startRouter(page, null);

        expect(await page.evaluate(() => {
            return window.location.href;
        })).to.be.equal(`http://localhost:${port}/#/home`);
    });

    it("can have contexts and start with specified one", async () => {
        await page.goto(`http://localhost:${port}/`);
        await startRouter(page, "profile");

        expect(await page.evaluate(() => {
            return window.location.href;
        })).to.be.equal(`http://localhost:${port}/#/me`);
    });

    it("can go to a new page", async () => {
        await page.goto(`http://localhost:${port}/`);
        await startRouter(page);

        await page.evaluate(async () => {
            await window.historyManager.Router.go("/me");
        });

        expect(await page.evaluate(() => {
            return window.location.href;
        })).to.be.equal(`http://localhost:${port}/#/me`);
    });

    it("can go to a new page of same context", async () => {
        await page.goto(`http://localhost:${port}/`);
        await startRouter(page, "profile");

        expect(await page.evaluate(() => {
            return window.location.href;
        })).to.be.equal(`http://localhost:${port}/#/me`);

        await page.evaluate(async () => {
            await window.historyManager.Router.go("/user/12");
        });

        expect(await page.evaluate(() => {
            return window.location.href;
        })).to.be.equal(`http://localhost:${port}/#/user/12`);

        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("profile");
    });

    it("has same before context if fallback defined", async () => {
        await page.goto(`http://localhost:${port}/`);
        await startRouter(page, "home");
        
        expect(await page.evaluate(() => {
            return window.location.href;
        })).to.be.equal(`http://localhost:${port}/#/home`);

        await page.evaluate(async () => {
            await window.historyManager.Router.go("/user/12");
        });

        expect(await page.evaluate(() => {
            return window.location.href;
        })).to.be.equal(`http://localhost:${port}/#/user/12`);

        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("home");
    });

    it("fallbacks context if none before", async () => {
        await page.goto(`http://localhost:${port}/#/user/12`);
        await startRouter(page, null);

        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("profile");
    });

    it("can avoid hashbang", async () => {
        await page.goto(`http://localhost:${port}/user/12`);
        await startRouter(page, null, "/");

        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("profile");
    });
});