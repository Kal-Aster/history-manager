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
    });

    it("can restore context with fallbackable default", async () => {
        await page.goto(`http://localhost:${port}/`);
        await startRouter(page, null);

        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("home");

        await page.evaluate(async () => {
            await window.historyManager.Router.restoreContext("settings");
        });
        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("settings");
    });

    it("can lock page and unlock", async () => {
        await page.goto(`http://localhost:${port}`);
        await startRouter(page, null, "/");

        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("home");

        expect(await page.evaluate(async () => {
            await window.historyManager.Router.lock();
            return window.location.hash;
        })).to.be.a("string").and.to.satisfy(hash => hash.startsWith("#R!:locked="));

        await page.goBack();
        // The lock traps the back asynchronously (it re-applies the `locked`
        // marker on the popstate that goBack triggers), so reading the hash the
        // instant goBack resolves races that restore. Wait for it to settle.
        await page.waitForFunction(
            () => window.location.hash.startsWith("#R!:locked=")
        );

        expect(await page.evaluate(async () => {
            return window.location.hash;
        })).to.be.a("string").and.to.satisfy(hash => hash.startsWith("#R!:locked="));

        expect(await page.evaluate(async () => {
            await window.historyManager.Router.unlock();
            return window.location.hash;
        })).to.be.equal("");
    })

    it("keeps a hard lock consistent when a non-forced unlock is refused", async () => {
        await page.goto(`http://localhost:${port}`);
        await startRouter(page, null, "/");

        // Hard lock: no navigation listener, so a non-forced unlock is refused.
        expect(await page.evaluate(async () => {
            await window.historyManager.Router.lock();
            return window.location.hash;
        })).to.be.a("string").and.to.satisfy(hash => hash.startsWith("#R!:locked="));

        // A refused non-forced unlock must NOT corrupt state: the lock stays
        // active and the URL marker remains (before the fix it was spliced out
        // of the registry, orphaning the work and stranding the marker).
        const afterRefused = await page.evaluate(async () => {
            const result = await window.historyManager.NavigationLock.unlock(false);
            return {
                result,
                stillLocked: window.historyManager.NavigationLock.locked(),
                hash: window.location.hash
            };
        });
        expect(afterRefused.result).to.be.equal(false);
        expect(afterRefused.stillLocked).to.be.equal(true);
        expect(afterRefused.hash).to.satisfy(hash => hash.startsWith("#R!:locked="));

        // A forced unlock afterwards still cleans everything up.
        expect(await page.evaluate(async () => {
            await window.historyManager.Router.unlock();
            return window.location.hash;
        })).to.be.equal("");
    })

    it("blocks navigation while a hard lock is held", async () => {
        await page.goto(`http://localhost:${port}`);
        await startRouter(page, null, "/");

        await page.evaluate(async () => {
            await window.historyManager.Router.lock();
        });

        // A hard lock rejects programmatic navigation and keeps the context.
        const attempt = await page.evaluate(async () => {
            try {
                await window.historyManager.Router.go("me");
                return { rejected: false };
            } catch (e) {
                return { rejected: true };
            }
        });
        expect(attempt.rejected).to.be.equal(true);
        expect(await page.evaluate(() => {
            return window.historyManager.Router.getContext();
        })).to.be.equal("home");

        // Once force-unlocked, navigation proceeds again.
        expect(await page.evaluate(async () => {
            await window.historyManager.Router.unlock();
            await window.historyManager.Router.go("me");
            return window.historyManager.Router.getContext();
        })).to.be.equal("profile");
    })

    it("stacks and unstacks multiple locks without drifting", async () => {
        await page.goto(`http://localhost:${port}`);
        await startRouter(page, null, "/");

        // Build a bit of history so any stray history.go(-1) stays observable
        // (instead of escaping the app), and settle on a known page.
        const baseline = await page.evaluate(async () => {
            const Router = window.historyManager.Router;
            await Router.go("user/1");
            await Router.go("user/2");
            await Router.go("user/3");
            return location.href;
        });

        // Stack three locks sequentially. Before the fix the 2nd/3rd lock()
        // hung forever waiting on the first lock's work; the race guard turns
        // that hang into a clear failure instead of a mocha timeout.
        const stacked = await page.evaluate(async () => {
            const Router = window.historyManager.Router;
            for (let i = 0; i < 3; i++) {
                await Promise.race([
                    Router.lock(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("lock() hung")), 3000))
                ]);
            }
            return {
                locked: window.historyManager.NavigationLock.locked(),
                hash: location.hash
            };
        });
        expect(stacked.locked).to.be.equal(true);
        expect(stacked.hash).to.satisfy(hash => hash.startsWith("#R!:locked="));

        // Unstack all three; a balanced lock/unlock must land back exactly on
        // the pre-lock URL with no stray option markers.
        expect(await page.evaluate(async () => {
            const Router = window.historyManager.Router;
            for (let i = 0; i < 3; i++) {
                await Router.unlock();
            }
            return location.href;
        })).to.be.equal(baseline);
        expect(await page.evaluate(() => {
            return window.historyManager.NavigationLock.locked();
        })).to.be.equal(false);
    })
});