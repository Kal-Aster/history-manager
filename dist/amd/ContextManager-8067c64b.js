define(['exports', './tslib.es6-ee56af75', './PathGenerator-2df3f407', './OptionsManager-0057cf14'], function (exports, tslib_es6, PathGenerator, OptionsManager) { 'use strict';

    var BASE = window.location.href.split("#")[0] + "#";
    function base(value) {
        if (value != null) {
            BASE = value;
        }
        return BASE;
    }
    function get() {
        return PathGenerator.prepare(OptionsManager.clearHref().split(BASE).slice(1).join(BASE));
    }
    function construct(href) {
        switch (href[0]) {
            case "?": {
                href = get().split("?")[0] + href;
                break;
            }
            case "#": {
                href = get().split("#")[0] + href;
                break;
            }
        }
        return BASE + href;
    }

    var URLManager = /*#__PURE__*/Object.freeze({
        __proto__: null,
        base: base,
        get: get,
        construct: construct
    });

    var ContextManager = (function () {
        function ContextManager() {
            this._contexts = new Map();
            this._hrefs = [];
            this._index = -1;
            this._length = 0;
        }
        ContextManager.prototype.clean = function () {
            if (this._index < this._length - 1) {
                var index_1 = this._index;
                var newHREFs_1 = [];
                this._hrefs.some(function (c_hrefs) {
                    var newCHrefs = [];
                    var result = c_hrefs[1].some(function (href) {
                        if (index_1-- >= 0) {
                            newCHrefs.push(href);
                            return false;
                        }
                        return true;
                    });
                    if (newCHrefs.length) {
                        newHREFs_1.push([c_hrefs[0], newCHrefs]);
                    }
                    return result;
                });
                this._hrefs = newHREFs_1;
                this._length = this._index + 1;
            }
        };
        ContextManager.prototype.currentContext = function () {
            if (this._hrefs.length === 0) {
                return null;
            }
            var index = this._index;
            var context;
            if (this._hrefs.some(function (_a) {
                var _b = tslib_es6.__read(_a, 2), c = _b[0], hrefs = _b[1];
                context = c;
                index -= hrefs.length;
                return index < 0;
            })) {
                return context;
            }
            return null;
        };
        ContextManager.prototype.contextOf = function (href, skipFallback) {
            var e_1, _a;
            if (skipFallback === void 0) { skipFallback = true; }
            var foundContext = null;
            href = href.split("#")[0].split("?")[0];
            try {
                for (var _b = tslib_es6.__values(this._contexts.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_es6.__read(_c.value, 2), context = _d[0], _e = tslib_es6.__read(_d[1], 1), hrefs = _e[0];
                    if (hrefs.some(function (c_href) {
                        if (c_href.fallback && skipFallback) {
                            return false;
                        }
                        return c_href.path.test(href);
                    })) {
                        foundContext = context;
                        break;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return foundContext;
        };
        ContextManager.prototype.insert = function (href, replace) {
            if (replace === void 0) { replace = false; }
            this.clean();
            var foundContext = this.contextOf(href, this._length > 0);
            var previousContext = this._hrefs.length > 0 ? this._hrefs[this._hrefs.length - 1] : null;
            if (foundContext == null) {
                if (this._hrefs.length > 0) {
                    this._hrefs[this._hrefs.length - 1][1].push(href);
                    this._length++;
                    this._index++;
                }
            }
            else {
                var i_1 = -1;
                if (this._hrefs.some(function (c_hrefs, index) {
                    if (c_hrefs[0] === foundContext) {
                        i_1 = index;
                        return true;
                    }
                    return false;
                })) {
                    var c_hrefs = this._hrefs.splice(i_1, 1)[0];
                    if (href !== c_hrefs[1][c_hrefs[1].length - 1]) {
                        c_hrefs[1].push(href);
                        this._length++;
                        this._index++;
                    }
                    this._hrefs.push(c_hrefs);
                }
                else {
                    this._hrefs.push([foundContext, [href]]);
                    this._length++;
                    this._index++;
                }
            }
            if (replace && this._hrefs.length > 0) {
                var lastContext = this._hrefs[this._hrefs.length - 1];
                if (lastContext === previousContext) {
                    if (lastContext[1].length > 1) {
                        do {
                            lastContext[1].splice(-2, 1);
                            this._length--;
                            this._index--;
                        } while (lastContext[1].length > 1 &&
                            lastContext[1][lastContext[1].length - 2] === href);
                    }
                }
                else if (previousContext != null) {
                    previousContext[1].splice(-1, 1);
                    this._length--;
                    this._index--;
                }
            }
        };
        ContextManager.prototype.goBackward = function () {
            this._index = Math.max(--this._index, 0);
            return this.get();
        };
        ContextManager.prototype.goForward = function () {
            this._index = Math.min(++this._index, this._length - 1);
            return this.get();
        };
        ContextManager.prototype.get = function (index) {
            if (index === void 0) { index = this._index; }
            var href;
            if (this._hrefs.some(function (_a) {
                var _b = tslib_es6.__read(_a, 2), c = _b[0], hrefs = _b[1];
                var length = hrefs.length;
                if (index >= length) {
                    index -= length;
                    return false;
                }
                href = hrefs[index];
                return true;
            })) {
                return href;
            }
            return null;
        };
        ContextManager.prototype.index = function (value) {
            if (value === void 0) {
                return this._index;
            }
            value = parseInt(value, 10);
            if (isNaN(value)) {
                throw new Error("value must be a number");
            }
            this._index = value;
        };
        ContextManager.prototype.length = function () {
            return this._length;
        };
        ContextManager.prototype.getContextNames = function () {
            return Array.from(this._contexts.keys());
        };
        ContextManager.prototype.getDefaultOf = function (context) {
            var c = this._contexts.get(context);
            if (!c) {
                return null;
            }
            var href = c[1];
            if (href == null) {
                return null;
            }
            return href;
        };
        ContextManager.prototype.restore = function (context) {
            var _this = this;
            var tmpHREFs = this._hrefs;
            this.clean();
            if (this._hrefs.length) {
                var lastContext = this._hrefs[this._hrefs.length - 1];
                if (lastContext[0] === context) {
                    var path = this._contexts.get(context)[1] || lastContext[1][0];
                    var numPages = lastContext[1].splice(1).length;
                    this._length -= numPages;
                    this._index -= numPages;
                    lastContext[1][0] = path;
                    return true;
                }
            }
            if (!this._hrefs.some(function (c, i) {
                if (c[0] === context) {
                    if (i < _this._hrefs.length - 1) {
                        _this._hrefs.push(_this._hrefs.splice(i, 1)[0]);
                    }
                    return true;
                }
                return false;
            })) {
                var c = this._contexts.get(context);
                if (c == null) {
                    this._hrefs = tmpHREFs;
                    return false;
                }
                var href = c[1];
                if (href != null) {
                    this.insert(href);
                    return true;
                }
                return false;
            }
            return true;
        };
        ContextManager.prototype.addContextPath = function (context_name, path, fallback) {
            if (fallback === void 0) { fallback = false; }
            var pathRegexp = PathGenerator.generate(path);
            var context = this._contexts.get(context_name);
            if (context == null) {
                this._contexts.set(context_name, context = [[], null]);
            }
            context[0].push({
                path: pathRegexp,
                fallback: fallback
            });
            return pathRegexp;
        };
        ContextManager.prototype.setContextDefaultHref = function (context_name, href) {
            var context = this._contexts.get(context_name);
            if (context == null) {
                this._contexts.set(context_name, context = [[], null]);
            }
            context[1] = href;
        };
        ContextManager.prototype.setContext = function (context) {
            var _this = this;
            context.paths.forEach(function (path) {
                _this.addContextPath(context.name, path.path, path.fallback);
            });
            if (context.default !== undefined) {
                this.setContextDefaultHref(context.name, context.default);
            }
        };
        ContextManager.prototype.hrefs = function () {
            var hrefs = [];
            this._hrefs.forEach(function (_a) {
                var _b = tslib_es6.__read(_a, 2), c = _b[0], c_hrefs = _b[1];
                hrefs.push.apply(hrefs, c_hrefs);
            });
            return hrefs;
        };
        return ContextManager;
    }());

    var ContextManager$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        ContextManager: ContextManager
    });

    exports.ContextManager = ContextManager;
    exports.ContextManager$1 = ContextManager$1;
    exports.URLManager = URLManager;
    exports.base = base;
    exports.construct = construct;
    exports.get = get;

});
