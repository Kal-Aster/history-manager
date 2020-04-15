// @ts-ignore
import Router = require("history-manager/Router");

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

document.querySelector("#restoreHome")!.addEventListener("click", () => {
    Router.restoreContext("home");
});
document.querySelector("#restoreProfile")!.addEventListener("click", () => {
    Router.restoreContext("profile");
});
document.querySelector("#restoreSearch")!.addEventListener("click", () => {
    Router.restoreContext("search");
});

Router.route("user/:id", (location, keymap) => {
    console.log("user:", keymap.get("id"));
});
Router.route("/(.*)*", (location) => {
    console.log("landed at", location.href);
});
Router.create().route("/:route*", (_, keymap) => {
    console.log("landed with", keymap);
});

// @ts-ignore
import NavigationLock = require("history-manager/NavigationLock");

document.querySelector("#lock")!.addEventListener("click", () => {
    NavigationLock.lock();
});
document.querySelector("#weakLock")!.addEventListener("click", () => {
    NavigationLock.lock().listen(e => e.preventDefault());
});
document.querySelector("#unlock")!.addEventListener("click", () => {
    NavigationLock.unlock();
});

document.querySelector("#locktest")!.addEventListener("click", () => {
    NavigationLock.lock();
    NavigationLock.unlock();
    Router.go("user/22");
    Router.go("user/123");
    Router.go("user/123");
});
document.querySelector("#gotest")!.addEventListener("click", () => {
    Router.go("user/123");
    Router.go("user/456");
    Router.go("user/789");
    Router.go(-3);
    Router.go(2);
});

Router.start("home");