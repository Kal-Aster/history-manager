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

    it("drops the whole options portion when reloading a locked page", async () => {
        await page.goto(`http://localhost:${port}`);
        await startRouter(page, null, "/");

        expect(await page.evaluate(async () => {
            await window.historyManager.Router.lock();
            return window.location.hash;
        })).to.be.a("string").and.to.satisfy(hash => hash.startsWith("#R!:locked="));

        // A reload drops the in-memory lock, so the stale `locked` marker is
        // cleaned up on start. With no option left the divider must go too,
        // instead of leaving a bare `#R!:` behind.
        await page.reload();
        await startRouter(page, null, "/");

        expect(await page.evaluate(() => {
            return {
                hash: window.location.hash,
                href: window.location.href,
                locked: window.historyManager.NavigationLock.locked()
            };
        })).to.deep.equal({
            hash: "",
            href: `http://localhost:${port}/home`,
            locked: false
        });
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

    it("re-traps to the top lock when going back through stacked cooperative locks", async () => {
        await page.goto(`http://localhost:${port}`);
        await startRouter(page, null, "/");

        // Baseline history so a back press stays observable inside the app.
        const baseline = await page.evaluate(async () => {
            const Router = window.historyManager.Router;
            await Router.go("user/1");
            await Router.go("user/2");
            return location.href;
        });

        // Stack two cooperative locks. Each listener approves the release
        // (preventDefault) on the first back attempt and records that it fired,
        // so we can prove the TOP lock is the one consulted (LIFO). Before the
        // fix the very first back press ping-ponged forever between the pre-lock
        // entry and the lower lock's entry, and no listener was ever consulted.
        const ids = await page.evaluate(async () => {
            const Router = window.historyManager.Router;
            window.__fired = [];
            const ids = [];
            for (let i = 0; i < 2; i++) {
                const lock = await Router.lock();
                ids.push(lock.id);
                lock.listen(event => {
                    window.__fired.push(lock.id);
                    event.preventDefault(); // approve this release
                });
            }
            return ids; // [lower, higher]; the higher id is the top lock
        });
        expect(ids[1]).to.be.greaterThan(ids[0]);
        expect(await page.evaluate(() =>
            window.historyManager.NavigationLock.locked()
        )).to.be.equal(true);

        // First back press: must re-trap to the top lock, consult its listener
        // and release only it. We settle back on the *lower* lock's entry with
        // exactly one lock still held. The timeout turns the buggy infinite
        // navigation loop into a clear failure instead of a mocha-wide timeout.
        await page.evaluate(() => window.history.back());
        await page.waitForFunction(
            (lowerId) =>
                window.__fired.length === 1 &&
                location.hash === "#R!:locked=" + lowerId,
            ids[0],
            { timeout: 5000 }
        );
        expect(await page.evaluate(() =>
            window.historyManager.NavigationLock.locked()
        )).to.be.equal(true);

        // Second back press: releases the remaining lock and lands back exactly
        // on the pre-lock url with no lock held.
        await page.evaluate(() => window.history.back());
        await page.waitForFunction(
            (base) =>
                !window.historyManager.NavigationLock.locked() &&
                location.href === base,
            baseline,
            { timeout: 5000 }
        );

        // LIFO: the later-created (top) lock's listener fired first.
        const fired = await page.evaluate(() => window.__fired);
        expect(fired).to.have.lengthOf(2);
        expect(fired[0]).to.be.greaterThan(fired[1]);
        expect(fired[0]).to.be.equal(ids[1]);
        expect(fired[1]).to.be.equal(ids[0]);
    })

    it("prepares optional catch-all groups without forcing a double slash", async () => {
        await page.goto(`http://localhost:${port}/`);

        const result = await page.evaluate(() => {
            const { PathGenerator } = window.historyManager;
            const catchAll = PathGenerator.generate("{/*route}").regexp;
            return {
                // "{/*route}" must stay untouched: prefixing "/" would leave a
                // literal slash before the optional group and require "//".
                preparedCatchAll: PathGenerator.prepare("{/*route}"),
                matchesSingleSlash: catchAll.test("/foobar"),
                matchesRoot: catchAll.test("/"),
                // plain paths are still normalised to a single leading slash.
                preparedPlain: PathGenerator.prepare("home"),
                preparedAlready: PathGenerator.prepare("/home"),
                preparedDoubled: PathGenerator.prepare("//home"),
                preparedLeadingSlashGroup: PathGenerator.prepare("/{*route}")
            };
        });

        expect(result.preparedCatchAll).to.be.equal("{/*route}");
        expect(result.matchesSingleSlash).to.be.equal(true);
        expect(result.matchesRoot).to.be.equal(true);
        expect(result.preparedPlain).to.be.equal("/home");
        expect(result.preparedAlready).to.be.equal("/home");
        expect(result.preparedDoubled).to.be.equal("/home");
        expect(result.preparedLeadingSlashGroup).to.be.equal("/{*route}");
    })

    it("resolves a catch-all fallback and lets primaries win over earlier fallbacks", async () => {
        await page.goto(`http://localhost:${port}/`);

        const result = await page.evaluate(() => {
            const { ContextManager } = window.historyManager;
            const cm = new ContextManager();
            // "home" is declared FIRST and owns a catch-all fallback.
            cm.setContext({
                name: "home",
                paths: [{ path: "/home" }, { path: "{/*route}", fallback: true }],
                default: "/home"
            });
            // "profile" is declared AFTER: its primaries must not be shadowed by
            // home's catch-all fallback.
            cm.setContext({
                name: "profile",
                paths: [{ path: "/me" }, { path: "/users/:id" }],
                default: "/me"
            });
            return {
                unknownViaFallback: cm.contextOf("/foobar", false),
                mePrimary: cm.contextOf("/me", false),
                userPrimary: cm.contextOf("/users/7", false),
                homePrimary: cm.contextOf("/home", false),
                unknownSkippingFallback: cm.contextOf("/foobar", true)
            };
        });

        // An unmatched url is caught by home's catch-all fallback (bug #1).
        expect(result.unknownViaFallback).to.be.equal("home");
        // A later context's primary beats an earlier context's fallback (bug #2).
        expect(result.mePrimary).to.be.equal("profile");
        expect(result.userPrimary).to.be.equal("profile");
        // A primary still resolves to its own context.
        expect(result.homePrimary).to.be.equal("home");
        // Skipping fallbacks, an unmatched url resolves to nothing.
        expect(result.unknownSkippingFallback).to.be.equal(null);
    })

    it("parses query params (getQueryParam / hasQueryParam / parsedQuery)", async () => {
        await page.goto(`http://localhost:${port}/`);

        const r = await page.evaluate(() => {
            const { Router } = window.historyManager;
            const loc = Router.getLocation(
                "/page?a=1&b=2&flag&empty=&enc=hello%20world&plus=hello+world"
            );
            return {
                a: loc.getQueryParam("a"),
                b: loc.getQueryParam("b"),
                flag: loc.getQueryParam("flag"),   // bare key -> null
                empty: loc.getQueryParam("empty"), // "key=" -> ""
                enc: loc.getQueryParam("enc"),     // %20 decoded
                plus: loc.getQueryParam("plus"),   // "+" decoded to a space
                missing: loc.getQueryParam("nope"),
                hasA: loc.hasQueryParam("a"),
                hasFlag: loc.hasQueryParam("flag"),
                hasMissing: loc.hasQueryParam("nope"),
                parsed: loc.parsedQuery
            };
        });

        expect(r.a).to.be.equal("1");
        expect(r.b).to.be.equal("2");
        expect(r.flag).to.be.equal(null);
        expect(r.empty).to.be.equal("");
        expect(r.enc).to.be.equal("hello world");
        expect(r.plus).to.be.equal("hello world");
        expect(r.missing).to.be.equal(undefined);
        expect(r.hasA).to.be.equal(true);
        expect(r.hasFlag).to.be.equal(true);
        expect(r.hasMissing).to.be.equal(false);
        expect(r.parsed).to.deep.equal({
            a: "1", b: "2", empty: "", enc: "hello world", flag: null, plus: "hello world"
        });
    })

    it("builds query strings (addQueryParam / removeQueryParam) with sorted keys and encoding", async () => {
        await page.goto(`http://localhost:${port}/`);

        const r = await page.evaluate(() => {
            const { Router } = window.historyManager;
            const out = {};

            // keys come out sorted: adding "a" to a query holding "b" -> a before b
            const l1 = Router.getLocation("/p?b=2");
            l1.addQueryParam("a", "1");
            out.sorted = l1.query;

            // a null value produces a bare key (no "=")
            const l2 = Router.getLocation("/p");
            l2.addQueryParam("flag");
            out.bare = l2.query;

            // values are percent-encoded (space -> %20, "&" -> %26)
            const l3 = Router.getLocation("/p");
            l3.addQueryParam("q", "a b&c");
            out.encoded = l3.query;

            // removing one key keeps the rest
            const l4 = Router.getLocation("/p?a=1&b=2");
            l4.removeQueryParam("a");
            out.removed = l4.query;

            // removing the last key clears the query entirely
            const l5 = Router.getLocation("/p?only=1");
            l5.removeQueryParam("only");
            out.removedAll = l5.query;

            return out;
        });

        expect(r.sorted).to.be.equal("?a=1&b=2");
        expect(r.bare).to.be.equal("?flag");
        expect(r.encoded).to.be.equal("?q=a%20b%26c");
        expect(r.removed).to.be.equal("?b=2");
        expect(r.removedAll).to.be.equal("");
    })
});