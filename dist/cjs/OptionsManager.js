'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib_es6 = require('./tslib.es6-088f17e5.js');
var index = require('./index-241ea07e.js');

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
        var _b = tslib_es6.__read(_a, 2), key = _b[0], value = _b[1];
        if (value !== undefined) {
            filteredOpts[key] = value;
        }
    });
    return index.queryString.stringify(filteredOpts);
}
function get() {
    return index.queryString.parse(splitHref()[1]);
}
function set(opts) {
    var newHref = splitHref()[0] + DIVIDER + optsToStr(opts);
    return goTo(newHref, true);
}
function add(opt, value) {
    var opts = get();
    if (opts[opt] === undefined || opts[opt] !== value) {
        opts[opt] = value || null;
        return set(opts);
    }
    return new Promise(function (resolve) { resolve(); });
}
function remove(opt) {
    var opts = get();
    if (opts[opt] !== undefined) {
        delete opts[opt];
        return set(opts);
    }
    return new Promise(function (resolve) { resolve(); });
}
function goWith(href, opts, replace) {
    if (replace === void 0) { replace = false; }
    var newHref = splitHref(href)[0] + DIVIDER + optsToStr(opts);
    return goTo(newHref, replace);
}
function clearHref() {
    return splitHref()[0];
}
if (Object.keys(get()).length > 0) {
    set({});
}

exports.add = add;
exports.clearHref = clearHref;
exports.get = get;
exports.goWith = goWith;
exports.remove = remove;
exports.set = set;
