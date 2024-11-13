import express from "express";
import playwright from "playwright"

import { expect } from "chai";

import openPlaywrightBrowser from "./openPlaywrightBrowser.mjs";
import startRouter from "./startRouter.mjs";

describe("Router", function () {
    this.timeout(20000);

    /** @type {playwright.Browser} */
    let browser;
    /** @type {playwright.BrowserContext} */
    let context;
    /** @type {playwright.Page} */
    let page;

    /** @type {number} */
    let port;
    /** @type {express.Server} */
    let server;

    before(async () => {
        ({
            server, port,
            browser, context,
        } = await openPlaywrightBrowser({
            headless: true,
            useIndexHTML: false
        }));
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

    it("can restore context", async () => {
        await page.goto(`http://localhost:${port}/`);
        await startRouter(page, null, "/");

        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("home");

        await page.evaluate(async () => {
            await window.historyManager.Router.go("me");
        });
        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("profile");

        await page.evaluate(async () => {
            await window.historyManager.Router.restoreContext("search");
        });
        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("search");
        expect(await page.evaluate(() => {
            return window.location.href;
        })).to.be.equal(`http://localhost:${port}/search?recent`);
        
        await page.evaluate(async () => {
            await window.historyManager.Router.restoreContext("home");
        });
        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("home");
        
        await page.evaluate(async () => {
            await window.historyManager.Router.restoreContext("profile");
        });
        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("profile");

        expect(await page.evaluate(async () => {
            window.history.back();
            await new Promise(resolve => {
                window.addEventListener("historylanded", () => {
                    window.removeEventListener("historylanded", resolve);
                    resolve();
                });
            });
            return window.historyManager.Router.getContext();
        })).to.be.equal("home");
    })
});