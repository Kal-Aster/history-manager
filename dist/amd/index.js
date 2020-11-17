define(['exports', './tslib.es6-ee56af75', './index-0e011f4d', './PathGenerator-7f8059ee', './index-c53f140f', './OptionsManager-1b0e876e', './ContextManager-be867ae1', './HistoryManager-0e6a4f77', './NavigationLock-d98c0bc4'], function (exports, tslib_es6, index$2, PathGenerator, index$1, OptionsManager, ContextManager, HistoryManager, NavigationLock) { 'use strict';

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
        if (href === void 0) { href = ContextManager.get(); }
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
        pathname = PathGenerator.prepare(pathname);
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
                            pathname = PathGenerator.prepare(value);
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
                    path.push(PathGenerator.prepare(value));
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
                pathname = PathGenerator.prepare(value);
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
                    cachedQuery = index$1.queryString.parse(query.replace(/^\?/, ""));
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
                var newQuery = tslib_es6.__assign(tslib_es6.__assign({}, this.parsedQuery), (_d = {}, _d[param] = value, _d));
                cachedQuery = null;
                query = index$1.queryString.stringify(newQuery);
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
                this.query = index$1.queryString.stringify(parsedQuery);
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
    function _go(path, replace, emit) {
        if (replace === void 0) { replace = false; }
        if (emit === void 0) { emit = true; }
        var lastEmitRoute = emitRoute;
        emitRoute = emit;
        return (replace ? HistoryManager.replace(path) : HistoryManager.assign(path)).catch(function () {
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
            var regex = PathGenerator.generate(path, keys);
            this[REDIRECTIONS].push({ regex: regex, keys: keys, redirection: PathGenerator.prepare(redirection) });
            return regex;
        };
        GenericRouter.prototype.unredirect = function (path) {
            _throwIfDestroyed(this);
            var keys = [];
            var regex = PathGenerator.generate(path, keys);
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
            var regex = PathGenerator.generate(path, keys);
            this[ROUTES].push({ regex: regex, keys: keys, callback: callback });
            return regex;
        };
        GenericRouter.prototype.unroute = function (path) {
            _throwIfDestroyed(this);
            var keys = [];
            var regex = PathGenerator.generate(path, keys);
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
        return HistoryManager.start(startingContext);
    }
    function index() {
        return HistoryManager.index();
    }
    function getLocationAt(index) {
        var href = HistoryManager.getHREFAt(index);
        if (href == null) {
            return null;
        }
        return getLocation(href);
    }
    function addContextPath(context, href, isFallback) {
        if (isFallback === void 0) { isFallback = false; }
        return HistoryManager.addContextPath(context, href, isFallback);
    }
    function setContextDefaultHref(context, href) {
        return HistoryManager.setContextDefaultHref(context, href);
    }
    function setContext(context) {
        return HistoryManager.setContext(context);
    }
    function getContext(href) {
        return HistoryManager.getContext(href);
    }
    function restoreContext(context, defaultHref) {
        return HistoryManager.restore(context);
    }
    function getContextDefaultOf(context) {
        return HistoryManager.getContextDefaultOf(context);
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
        options = tslib_es6.__assign({}, options);
        return new Promise(function (promiseResolve, promiseReject) {
            var goingEvent = new CustomEvent("router:going", {
                detail: tslib_es6.__assign({ direction: path_index }, options),
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
                HistoryManager.go(path_index).then(promiseResolve, function () {
                    emitRoute = lastEmitRoute_1;
                });
            }
        });
    }
    function setQueryParam(param, value, options) {
        var promiseResolve;
        var promise = new Promise(function (resolve) { promiseResolve = resolve; });
        HistoryManager.onWorkFinished(function () {
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
        return NavigationLock.lock();
    }
    function unlock(force) {
        if (force === void 0) { force = true; }
        return NavigationLock.unlock(force);
    }
    function destroy() {
        throw new Error("cannot destroy main Router");
    }
    function getBase() {
        return ContextManager.base();
    }
    function setBase(newBase) {
        ContextManager.base(newBase.replace(/[\/]+$/, ""));
        _emit();
    }
    function isLocked() {
        return NavigationLock.locked();
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
        NavigationLock: NavigationLock.NavigationLock
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
                        var _b = tslib_es6.__read(_a, 2), callback = _b[0], context = _b[1];
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
                var _a = tslib_es6.__read(ondoneCallbacks.shift(), 2), callback = _a[0], context = _a[1];
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

    exports.PathGenerator = PathGenerator.PathGenerator;
    exports.OptionsManager = OptionsManager.OptionsManager;
    exports.ContextManager = ContextManager.ContextManager$1;
    exports.URLManager = ContextManager.URLManager;
    exports.HistoryManager = HistoryManager.HistoryManager;
    exports.NavigationLock = NavigationLock.NavigationLock;
    exports.Router = Router;
    exports.WorkManager = WorkManager;

    Object.defineProperty(exports, '__esModule', { value: true });

});
