var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "querystring"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var querystring = require("querystring");
    var DIVIDER = "#R!:";
    var catchPopState = null;
    window.addEventListener("popstate", function (event) {
        if (catchPopState == null) {
            return;
        }
        event.stopImmediatePropagation();
        event.stopPropagation();
        catchPopState();
    }, true);
    function onCatchPopState(onCatchPopState, once) {
        if (once === void 0) { once = false; }
        if (once) {
            var tmpOnCatchPopState_1 = onCatchPopState;
            onCatchPopState = function () {
                catchPopState = null;
                tmpOnCatchPopState_1();
            };
        }
        catchPopState = onCatchPopState;
    }
    function goTo(href, replace) {
        if (replace === void 0) { replace = false; }
        return new Promise(function (resolve) {
            if (href === window.location.href) {
                return resolve();
            }
            onCatchPopState(resolve, true);
            if (replace) {
                window.location.replace(href);
            }
            else {
                window.location.assign(href);
            }
        });
    }
    function splitHref(href) {
        if (href === void 0) { href = window.location.href; }
        var splitted = href.split(DIVIDER);
        if (splitted.length > 2) {
            return [
                splitted.slice(0, splitted.length - 1).join(DIVIDER),
                splitted[splitted.length - 1]
            ];
        }
        return [splitted[0], splitted[1] || ""];
    }
    function optsToStr(opts) {
        var filteredOpts = {};
        Object.entries(opts).forEach(function (_a) {
            var _b = __read(_a, 2), key = _b[0], value = _b[1];
            if (value !== undefined) {
                filteredOpts[key] = value;
            }
        });
        return querystring.encode(filteredOpts);
    }
    function get() {
        return querystring.decode(splitHref()[1]);
    }
    exports.get = get;
    function set(opts) {
        var newHref = splitHref()[0] + DIVIDER + optsToStr(opts);
        return goTo(newHref, true);
    }
    exports.set = set;
    function add(opt, value) {
        var opts = get();
        if (opts[opt] === undefined || opts[opt] !== value) {
            opts[opt] = value || null;
            return set(opts);
        }
        return new Promise(function (resolve) { resolve(); });
    }
    exports.add = add;
    function remove(opt) {
        var opts = get();
        if (opts[opt] !== undefined) {
            delete opts[opt];
            return set(opts);
        }
        return new Promise(function (resolve) { resolve(); });
    }
    exports.remove = remove;
    function goWith(href, opts, replace) {
        if (replace === void 0) { replace = false; }
        var newHref = splitHref(href)[0] + DIVIDER + optsToStr(opts);
        return goTo(newHref, replace);
    }
    exports.goWith = goWith;
    function clearHref() {
        return splitHref()[0];
    }
    exports.clearHref = clearHref;
    if (Object.keys(get()).length > 0) {
        set({});
    }
});
