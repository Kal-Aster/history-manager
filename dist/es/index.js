import { b as __assign, _ as __read } from './tslib.es6-4eedd806.js';
import './index-71b123e0.js';
import { p as prepare, g as generate } from './PathGenerator-5ecdbddb.js';
export { P as PathGenerator } from './PathGenerator-5ecdbddb.js';
import { q as queryString } from './index-42276b71.js';
export { O as OptionsManager } from './OptionsManager-fa51c5df.js';
import { g as get, b as base } from './ContextManager-75e17814.js';
export { a as ContextManager, U as URLManager } from './ContextManager-75e17814.js';
import { s as start$1, i as index$1, g as getHREFAt, a as addContextPath$1, b as setContextDefaultHref$1, c as setContext$1, d as getContext$1, r as restore, e as getContextDefaultOf$1, f as replace, h as assign, j as go$1, o as onWorkFinished } from './HistoryManager-371c4579.js';
export { H as HistoryManager } from './HistoryManager-371c4579.js';
import { l as lock$2, u as unlock$1, a as locked$1, N as NavigationLock } from './NavigationLock-2e339f5d.js';
export { N as NavigationLock } from './NavigationLock-2e339f5d.js';

var _a, _b, _c;
var ROUTES = Symbol("routes");
var REDIRECTIONS = Symbol("redirections");
var DESTROYED = Symbol("destroyed");
function KeyMapFrom(keys, values) {
    var map = new Map();
    keys.forEach(function (key, index) {
        map.set(key.name.toString(), values[index]);
    });
    return map;
}
var routers = [];
function getLocation(href) {
    if (href === void 0) { href = get(); }
    var pathname = "";
    var hash = "";
    var query = "";
    var cachedQuery = null;
    {
        var split = href.split("#");
        pathname = split.shift();
        hash = split.join("#");
        hash = hash ? "#" + hash : "";
    }
    {
        var split = pathname.split("?");
        pathname = split.shift();
        query = split.join("?");
        query = query ? "?" + query : "";
    }
    pathname = prepare(pathname);
    return {
        hrefIf: function (go) {
            var oldP = pathname;
            var oldH = hash;
            var oldQ = query;
            this.href = go;
            var hrefIf = this.href;
            pathname = oldP;
            hash = oldH;
            query = oldQ;
            return hrefIf;
        },
        get href() {
            return pathname + query + hash;
        },
        set href(value) {
            if (typeof value !== "string") {
                throw new Error("href should be a string");
            }
            if (!value) {
                return;
            }
            var match = value.match(/^([\/\\]{2,})|([\/\\]{1})|([#])|([\?])/);
            if (match) {
                switch (match[0]) {
                    case "?": {
                        query = "?" + encodeURI(value.substr(1)).replace("#", "%23").replace("?", "%3F");
                        break;
                    }
                    case "#": {
                        hash = value;
                        break;
                    }
                    case "/": {
                        pathname = prepare(value);
                        hash = "";
                        query = "";
                        break;
                    }
                    default: {
                        return;
                    }
                }
            }
            else {
                var path = pathname.split("/");
                path.pop();
                path.push(prepare(value));
                pathname = path.join("/");
                hash = "";
                query = "";
            }
        },
        get pathname() {
            return pathname;
        },
        set pathname(value) {
            if (typeof value !== "string") {
                throw new Error("pathname should be a string");
            }
            pathname = prepare(value);
        },
        get hash() {
            return hash;
        },
        set hash(value) {
            if (typeof value !== "string") {
                throw new Error("hash should be a string");
            }
            if (!value) {
                hash = "";
                return;
            }
            if (value.indexOf("#") !== 0) {
                value = "#" + value;
            }
            hash = value;
        },
        get query() {
            return query;
        },
        set query(value) {
            if (typeof value !== "string") {
                throw new Error("query should be a string");
            }
            cachedQuery = null;
            if (!value) {
                query = "";
                return;
            }
            if (value.indexOf("?") !== 0) {
                value = "?" + value;
            }
            query = encodeURI(value).replace("#", "%23");
        },
        get parsedQuery() {
            if (!query) {
                return {};
            }
            if (!cachedQuery) {
                cachedQuery = queryString.parse(query.replace(/^\?/, ""));
            }
            return cachedQuery;
        },
        hasQueryParam: function (param) {
            if (!query) {
                return false;
            }
            return this.parsedQuery[param] !== undefined;
        },
        getQueryParam: function (param) {
            if (!query) {
                return undefined;
            }
            return this.parsedQuery[param];
        },
        addQueryParam: function (param, value) {
            var _d;
            if (value === void 0) { value = null; }
            var newQuery = __assign(__assign({}, this.parsedQuery), (_d = {}, _d[param] = value, _d));
            cachedQuery = null;
            query = queryString.stringify(newQuery);
            if (query) {
                query = "?" + query;
            }
        },
        removeQueryParam: function (param) {
            if (!query) {
                return;
            }
            var parsedQuery = this.parsedQuery;
            delete parsedQuery[param];
            this.query = queryString.stringify(parsedQuery);
        }
    };
}
function emitSingle(router, location) {
    var path;
    if (location) {
        path = location.pathname;
    }
    else {
        location = getLocation();
        path = location.pathname;
    }
    var redirection = null;
    router[REDIRECTIONS].some(function (redirectionRoute) {
        var exec = redirectionRoute.regex.exec(path);
        if (exec) {
            redirection = { location: location, keymap: KeyMapFrom(redirectionRoute.keys, exec.slice(1)) };
            location = getLocation(redirectionRoute.redirection);
            path = location.pathname;
            return false;
        }
        return false;
    });
    router[ROUTES].some(function (route) {
        var exec = route.regex.exec(path);
        if (exec) {
            route.callback(location, KeyMapFrom(route.keys, exec.slice(1)), redirection);
            return true;
        }
        return false;
    });
}
function _emit() {
    var location = getLocation();
    routers.forEach(function (router) {
        emitSingle(router, location);
    });
}
var emitRoute = true;
function onland() {
    if (emitRoute) {
        _emit();
    }
    else {
        emitRoute = true;
    }
}
window.addEventListener("historylanded", onland);
function _go(path, replace$1, emit) {
    if (replace$1 === void 0) { replace$1 = false; }
    if (emit === void 0) { emit = true; }
    var lastEmitRoute = emitRoute;
    emitRoute = emit;
    return (replace$1 ? replace(path) : assign(path)).catch(function () {
        emitRoute = lastEmitRoute;
    });
}
function _throwIfDestroyed(router) {
    if (router[DESTROYED]) {
        throw new Error("Router destroyed");
    }
}
var GenericRouter = (function () {
    function GenericRouter() {
        this[_a] = [];
        this[_b] = [];
        this[_c] = false;
        routers.push(this);
    }
    GenericRouter.prototype.destroy = function () {
        if (this[DESTROYED]) {
            return;
        }
        var index = routers.indexOf(this);
        if (index > -1) {
            routers.splice(index, 1);
        }
        this[DESTROYED] = true;
    };
    GenericRouter.prototype.redirect = function (path, redirection) {
        _throwIfDestroyed(this);
        var keys = [];
        var regex = generate(path, keys);
        this[REDIRECTIONS].push({ regex: regex, keys: keys, redirection: prepare(redirection) });
        return regex;
    };
    GenericRouter.prototype.unredirect = function (path) {
        _throwIfDestroyed(this);
        var keys = [];
        var regex = generate(path, keys);
        var rIndex = -1;
        this[ROUTES].some(function (route, index) {
            var xSource = (regex.ignoreCase ? regex.source.toLowerCase() : regex.source);
            var ySource = (route.regex.ignoreCase ? route.regex.source.toLowerCase() : route.regex.source);
            if ((xSource === ySource) && (regex.global === route.regex.global) &&
                (regex.ignoreCase === route.regex.ignoreCase) && (regex.multiline === route.regex.multiline)) {
                rIndex = index;
                return true;
            }
            return false;
        });
        if (rIndex > -1) {
            this[ROUTES].splice(rIndex, 1);
        }
    };
    GenericRouter.prototype.route = function (path, callback) {
        _throwIfDestroyed(this);
        var keys = [];
        var regex = generate(path, keys);
        this[ROUTES].push({ regex: regex, keys: keys, callback: callback });
        return regex;
    };
    GenericRouter.prototype.unroute = function (path) {
        _throwIfDestroyed(this);
        var keys = [];
        var regex = generate(path, keys);
        var rIndex = -1;
        this[ROUTES].some(function (route, index) {
            var xSource = (regex.ignoreCase ? regex.source.toLowerCase() : regex.source);
            var ySource = (route.regex.ignoreCase ? route.regex.source.toLowerCase() : route.regex.source);
            if ((xSource === ySource) && (regex.global === route.regex.global) &&
                (regex.ignoreCase === route.regex.ignoreCase) && (regex.multiline === route.regex.multiline)) {
                rIndex = index;
                return true;
            }
            return false;
        });
        if (rIndex > -1) {
            this[ROUTES].splice(rIndex, 1);
        }
    };
    GenericRouter.prototype.emit = function () {
        emitSingle(this);
    };
    return GenericRouter;
}());
_a = ROUTES, _b = REDIRECTIONS, _c = DESTROYED;
var main = new GenericRouter();
function redirect(path, redirection) {
    return main.redirect(path, redirection);
}
function unredirect(path) {
    return main.unredirect(path);
}
function route(path, callback) {
    return main.route(path, callback);
}
function unroute(path) {
    return main.unroute(path);
}
function start(startingContext) {
    return start$1(startingContext);
}
function index() {
    return index$1();
}
function getLocationAt(index) {
    var href = getHREFAt(index);
    if (href == null) {
        return null;
    }
    return getLocation(href);
}
function addContextPath(context, href, isFallback) {
    if (isFallback === void 0) { isFallback = false; }
    return addContextPath$1(context, href, isFallback);
}
function setContextDefaultHref(context, href) {
    return setContextDefaultHref$1(context, href);
}
function setContext(context) {
    return setContext$1(context);
}
function getContext(href) {
    return getContext$1(href);
}
function restoreContext(context, defaultHref) {
    return restore(context);
}
function getContextDefaultOf(context) {
    return getContextDefaultOf$1(context);
}
function emit(single) {
    if (single === void 0) { single = false; }
    if (single) {
        return emitSingle(main);
    }
    return _emit();
}
function create() {
    return new GenericRouter();
}
function go(path_index, options) {
    var path_index_type = typeof path_index;
    if (path_index_type !== "string" && path_index_type !== "number") {
        throw new Error("router.go should receive an url string or a number");
    }
    options = __assign({}, options);
    return new Promise(function (promiseResolve, promiseReject) {
        var goingEvent = new CustomEvent("router:going", {
            detail: __assign({ direction: path_index }, options),
            cancelable: true
        });
        window.dispatchEvent(goingEvent);
        if (goingEvent.defaultPrevented) {
            promiseReject();
            return;
        }
        if (path_index_type === "string") {
            _go(path_index, (options && options.replace) || false, (options == null || options.emit == null) ? true : options.emit).then(promiseResolve);
        }
        else {
            var lastEmitRoute_1 = emitRoute;
            emitRoute = options.emit == null ? true : options.emit;
            go$1(path_index).then(promiseResolve, function () {
                emitRoute = lastEmitRoute_1;
            });
        }
    });
}
function setQueryParam(param, value, options) {
    var promiseResolve;
    var promise = new Promise(function (resolve) { promiseResolve = resolve; });
    onWorkFinished(function () {
        var location = getLocation();
        if (value === undefined) {
            location.removeQueryParam(param);
        }
        else {
            location.addQueryParam(param, value);
        }
        go(location.href, options).then(promiseResolve);
    });
    return promise;
}
function lock() {
    return lock$2();
}
function unlock(force) {
    if (force === void 0) { force = true; }
    return unlock$1(force);
}
function destroy() {
    throw new Error("cannot destroy main Router");
}
function getBase() {
    return base();
}
function setBase(newBase) {
    base(newBase.replace(/[\/]+$/, ""));
    _emit();
}
function isLocked() {
    return locked$1();
}

var Router = /*#__PURE__*/Object.freeze({
    __proto__: null,
    getLocation: getLocation,
    redirect: redirect,
    unredirect: unredirect,
    route: route,
    unroute: unroute,
    start: start,
    index: index,
    getLocationAt: getLocationAt,
    addContextPath: addContextPath,
    setContextDefaultHref: setContextDefaultHref,
    setContext: setContext,
    getContext: getContext,
    restoreContext: restoreContext,
    getContextDefaultOf: getContextDefaultOf,
    emit: emit,
    create: create,
    go: go,
    setQueryParam: setQueryParam,
    lock: lock,
    unlock: unlock,
    destroy: destroy,
    getBase: getBase,
    setBase: setBase,
    isLocked: isLocked,
    NavigationLock: NavigationLock
});

var locks = [];
function lock$1(locking_fn) {
    var released = false;
    var releasing = false;
    var onrelease = [];
    var promise;
    var lock = {
        get released() {
            return released;
        },
        get releasing() {
            return releasing;
        },
        release: function () {
            if (released) {
                return;
            }
            released = true;
            releasing = false;
            var i = locks.length - 1;
            for (; i >= 0; i--) {
                if (locks[i] === lock) {
                    locks.splice(i, 1);
                    break;
                }
            }
            if (i >= 0) {
                onrelease.forEach(function (_a) {
                    var _b = __read(_a, 2), callback = _b[0], context = _b[1];
                    callback.call(context || null);
                });
            }
        },
        beginRelease: function (start_fn) {
            releasing = true;
            start_fn();
        },
        onrelease: function (callback, context) {
            if (context === void 0) { context = null; }
            onrelease.push([callback, context || null]);
        }
    };
    return promise = new Promise(function (resolve) {
        ondone(function () {
            var result = locking_fn.call(lock, lock);
            locks.push(lock);
            if (result !== false && result !== void 0) {
                lock.release();
            }
            resolve(lock);
        });
    });
}
function locked() {
    return locks.length > 0 && locks.every(function (lock) { return !lock.releasing && !lock.released; });
}
var currentWork = -1;
var working = 0;
var ondoneCallbacks = [];
function completeWork() {
    if (currentWork === -1) {
        return;
    }
    if (--working === 0) {
        currentWork = -1;
        while (ondoneCallbacks.length && currentWork === -1) {
            var _a = __read(ondoneCallbacks.shift(), 2), callback = _a[0], context = _a[1];
            callback.call(context || null);
        }
    }
}
function ondoneWork(fn, context, workId) {
    if (currentWork !== -1 && currentWork !== workId) {
        ondoneCallbacks.push([fn, context || null]);
        return;
    }
    fn.call(context || null);
}
function startWork(start_fn, id) {
    if (id === void 0) { id = Date.now(); }
    if (locked()) {
        console.error("navigation is locked");
        return -1;
    }
    var completed = false;
    ondoneWork(function () {
        currentWork = id;
        working++;
        start_fn(function () {
            if (completed) {
                return;
            }
            completed = true;
            completeWork();
        }, id);
    }, null, id);
    return id;
}
function ondone(fn, context) {
    if (working) {
        ondoneCallbacks.push([fn, context || null]);
        return;
    }
    fn.call(context || null);
}

var WorkManager = /*#__PURE__*/Object.freeze({
    __proto__: null,
    lock: lock$1,
    locked: locked,
    startWork: startWork,
    ondone: ondone
});

export { Router, WorkManager };
