<!DOCTYPE html>
<html>
    <head>
        <meta name="format-detection" content="telephone=no">
        <meta name="msapplication-tap-highlight" content="no">
        <meta name="viewport" content="initial-scale=1, width=device-width, viewport-fit=cover">
        <meta charset="utf-8">
        
        <title>history-manager - test page</title>
    </head>
    <body>
        <a data-href="me">me [PROFILE]</a><br>
        <a data-href="user/12">user/12 [PROFILE as fallback]</a><br>
        <span id="user-12-replace">user/12 [PROFILE as fallback, replace]</span><br>
        <a data-href="home">home [HOME]</a><br>
        <a data-href="search?query=test">search?query=test [SEARCH]</a><br>

        <div></div>

        <button id="restoreHome">Restore home</button>
        <button id="restoreProfile">Restore profile</button>
        <button id="restoreSearch">Restore search</button>

        <div></div>
        
        <button id="lock">Lock</button>
        <button id="weakLock">Lock weakly</button>
        <button id="unlock">Unlock</button>

        <div></div>
        
        <button id="locktest">Lock test</button>
        <button id="gotest">Go test</button>

        <div></div>

        <button id="goreplace">Replace with search?recent=test</button>

        <div></div>
        
        <button id="queryparam">Set query param test</button>

        <div></div>

        <button id="replaceissamecontext">Replace is same context?</button>

        <script>
            if (window.history.replaceState) {
                window._ROUTER_BASE = window.location.pathname.split("/").slice(0, -1).join("/");
                window.history.replaceState({}, "", window._ROUTER_BASE + "<?php
                    echo array_key_exists('PATH_INFO', $_SERVER) ? $_SERVER['PATH_INFO'] : (
                        array_key_exists('ORIG_PATH_INFO', $_SERVER) ? $_SERVER['ORIG_PATH_INFO'] : '/'
                    )
                ?>");
            }
        </script>
        
        <script src="../dist/index.js"></script>
        <script>
        {
            if (window._ROUTER_BASE != null) {
                window.historyManager.URLManager.base(window._ROUTER_BASE);
            }
            Array.prototype.forEach.call(document.querySelectorAll("a[data-href]"), a => {
                const dataHref = a.getAttribute("data-href");
                const href = window.historyManager.URLManager.construct(dataHref, true);
                a.href = href;
                console.log(dataHref, href);
                a.addEventListener("click", function (event) {
                    event.preventDefault();
                    window.historyManager.Router.go(dataHref);
                    return false;
                });
            });

            const Router = window.historyManager.Router;
            const NavigationLock = window.historyManager.NavigationLock;
            Router.setContext({
                name: "home",
                paths: [
                    { path: "home" }
                ],
                default: "home"
            });
            Router.setContext({
                name: "profile",
                paths: [
                    { path: "me" },
                    { path: "user/:id", fallback: true }
                ],
                default: "me"
            });
            Router.setContext({
                name: "search",
                paths: [
                    { path: "search" }
                ],
                default: "search?recent"
            });
            document.querySelector("#user-12-replace").addEventListener("click", function () {
                Router.go("users/12", { replace: true });
            });
            document.querySelector("#restoreHome").addEventListener("click", function () {
                Router.restoreContext("home");
            });
            document.querySelector("#restoreProfile").addEventListener("click", function () {
                Router.restoreContext("profile");
            });
            document.querySelector("#restoreSearch").addEventListener("click", function () {
                Router.restoreContext("search");
            });
            Router.route("user/:id", function (location, keymap) {
                console.log("user:", keymap.get("id"));
            });
            Router.route("/(.*)*", function (location) {
                console.log("landed at", location.href);
            });
            Router.create().route("/:route(.*)", function (_, keymap) {
                console.log("landed with", keymap);
            });
            {
                const r = Router.create();
                r.route("me", function () { console.log("landed at me", arguments); });
                // r.redirect("users/12", "me");
            }
            document.querySelector("#lock").addEventListener("click", function () {
                NavigationLock.lock();
            });
            document.querySelector("#weakLock").addEventListener("click", function () {
                NavigationLock.lock().then(lock => { lock.listen(function (e) { return e.preventDefault(); }); });
            });
            document.querySelector("#unlock").addEventListener("click", function () {
                NavigationLock.unlock();
            });
            document.querySelector("#locktest").addEventListener("click", function () {
                NavigationLock.lock().then(lock => {
                    lock.unlock();
                    Router.go("user/22");
                    Router.go("user/123");
                    Router.go("user/123");
                });
                // NavigationLock.lock();
                // NavigationLock.unlock();
                // Router.go("user/22");
                // Router.go("user/123");
                // Router.go("user/123");
            });
            document.querySelector("#gotest").addEventListener("click", function () {
                Router.go("user/123");
                Router.go("user/456");
                Router.go("user/789");
                Router.go(-3);
                Router.go(2);
            });
            document.querySelector("#goreplace").addEventListener("click", function () {
                Router.go("search?recent=test", { replace: true });
            });
            var page = 1;
            document.querySelector("#queryparam").addEventListener("click", function () {
                if (Router.getLocation().pathname !== "queryparam") {
                    Router.go("queryparam?filters[color]=blue,red");
                }
                Router.setQueryParam("page", ++page).then(function () {
                    console.log(Router.location);
                });
            });
            document.querySelector("#replaceissamecontext").addEventListener("click", function () {
                Router.restoreContext("profile");
                Router.go("accedi", { replace: true }).then(function () {
                    console.log(Router.getContext());
                });
            });
            Router.start("home");
        }
        </script>
    </body>
</html>
