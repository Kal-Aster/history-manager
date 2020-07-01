var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "querystring", "./HistoryManager", "./NavigationLock", "./PathGenerator", "./URLManager"], factory);
    }
})(function (require, exports) {
    "use strict";
    var _a, _b, _c;
    var querystring = require("querystring");
    var HistoryManager = require("./HistoryManager");
    var NavigationLock = require("./NavigationLock");
    var PathGenerator = require("./PathGenerator");
    var URLManager = require("./URLManager");
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
        if (href === void 0) { href = URLManager.get(); }
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
                    cachedQuery = querystring.decode(query.replace(/^\?/, ""));
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
                query = querystring.encode(newQuery);
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
                this.query = querystring.encode(parsedQuery);
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
    function emit() {
        var location = getLocation();
        routers.forEach(function (router) {
            emitSingle(router, location);
        });
    }
    var emitRoute = true;
    function onland() {
        if (emitRoute) {
            emit();
        }
        else {
            emitRoute = true;
        }
    }
    window.addEventListener("historylanded", onland);
    function go(path, replace, emit) {
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
    main.start = function (startingContext) {
        return HistoryManager.start(startingContext);
    };
    main.index = function () {
        return HistoryManager.index();
    };
    main.getLocationAt = function (index) {
        var href = HistoryManager.getHREFAt(index);
        if (href == null) {
            return null;
        }
        return getLocation(href);
    };
    main.addContextPath = function (context, href, isFallback) {
        if (isFallback === void 0) { isFallback = false; }
        return HistoryManager.addContextPath(context, href, isFallback);
    };
    main.setContextDefaultHref = function (context, href) {
        return HistoryManager.setContextDefaultHref(context, href);
    };
    main.setContext = function (context) {
        return HistoryManager.setContext(context);
    };
    main.getContext = function (href) {
        return HistoryManager.getContext(href);
    };
    main.restoreContext = function (context, defaultHref) {
        return HistoryManager.restore(context);
    };
    main.emit = function (single) {
        if (single === void 0) { single = false; }
        if (single) {
            return emitSingle(this._router);
        }
        return emit();
    };
    main.create = function () {
        return new GenericRouter();
    };
    main.go = function routerGo(path_index, options) {
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
                go(path_index, (options && options.replace) || false, (options == null || options.emit == null) ? true : options.emit).then(promiseResolve);
            }
            else {
                var lastEmitRoute_1 = emitRoute;
                emitRoute = options.emit == null ? true : options.emit;
                HistoryManager.go(path_index).then(promiseResolve, function () {
                    emitRoute = lastEmitRoute_1;
                });
            }
        });
    };
    main.setQueryParam = function (param, value, options) {
        var _this = this;
        var promiseResolve;
        var promise = new Promise(function (resolve) { promiseResolve = resolve; });
        HistoryManager.onWorkFinished(function () {
            var location = _this.location;
            if (value === undefined) {
                location.removeQueryParam(param);
            }
            else {
                location.addQueryParam(param, value);
            }
            _this.go(location.href, options).then(promiseResolve);
        });
        return promise;
    };
    main.lock = function () {
        return NavigationLock.lock();
    };
    main.unlock = function (force) {
        if (force === void 0) { force = true; }
        return NavigationLock.unlock(force);
    };
    main.destroy = function () {
        throw new Error("cannot destroy main Router");
    };
    Object.defineProperty(main, "base", {
        get: function () {
            return URLManager.base();
        },
        set: function (newBase) {
            URLManager.base(newBase.replace(/[\/]+$/, ""));
            emit();
        },
        configurable: false
    });
    Object.defineProperty(main, "locked", {
        get: function () {
            return NavigationLock.locked();
        },
        configurable: false
    });
    Object.defineProperty(main, "location", {
        get: function () {
            return getLocation();
        },
        configurable: false
    });
    var Main = main;
    return Main;
});
