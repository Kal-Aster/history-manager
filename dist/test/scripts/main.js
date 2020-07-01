(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "history-manager/Router", "history-manager/NavigationLock"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Router = require("history-manager/Router");
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
    Router.create().route("/:route*", function (_, keymap) {
        console.log("landed with", keymap);
    });
    var NavigationLock = require("history-manager/NavigationLock");
    document.querySelector("#lock").addEventListener("click", function () {
        NavigationLock.lock();
    });
    document.querySelector("#weakLock").addEventListener("click", function () {
        NavigationLock.lock().listen(function (e) { return e.preventDefault(); });
    });
    document.querySelector("#unlock").addEventListener("click", function () {
        NavigationLock.unlock();
    });
    document.querySelector("#locktest").addEventListener("click", function () {
        NavigationLock.lock();
        NavigationLock.unlock();
        Router.go("user/22");
        Router.go("user/123");
        Router.go("user/123");
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
        if (Router.location.pathname !== "queryparam") {
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
});
