define(['exports'], function (exports) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
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
    }

    /**
     * Tokenize input string.
     */
    function lexer(str) {
        var tokens = [];
        var i = 0;
        while (i < str.length) {
            var char = str[i];
            if (char === "*" || char === "+" || char === "?") {
                tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
                continue;
            }
            if (char === "\\") {
                tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
                continue;
            }
            if (char === "{") {
                tokens.push({ type: "OPEN", index: i, value: str[i++] });
                continue;
            }
            if (char === "}") {
                tokens.push({ type: "CLOSE", index: i, value: str[i++] });
                continue;
            }
            if (char === ":") {
                var name = "";
                var j = i + 1;
                while (j < str.length) {
                    var code = str.charCodeAt(j);
                    if (
                    // `0-9`
                    (code >= 48 && code <= 57) ||
                        // `A-Z`
                        (code >= 65 && code <= 90) ||
                        // `a-z`
                        (code >= 97 && code <= 122) ||
                        // `_`
                        code === 95) {
                        name += str[j++];
                        continue;
                    }
                    break;
                }
                if (!name)
                    throw new TypeError("Missing parameter name at " + i);
                tokens.push({ type: "NAME", index: i, value: name });
                i = j;
                continue;
            }
            if (char === "(") {
                var count = 1;
                var pattern = "";
                var j = i + 1;
                if (str[j] === "?") {
                    throw new TypeError("Pattern cannot start with \"?\" at " + j);
                }
                while (j < str.length) {
                    if (str[j] === "\\") {
                        pattern += str[j++] + str[j++];
                        continue;
                    }
                    if (str[j] === ")") {
                        count--;
                        if (count === 0) {
                            j++;
                            break;
                        }
                    }
                    else if (str[j] === "(") {
                        count++;
                        if (str[j + 1] !== "?") {
                            throw new TypeError("Capturing groups are not allowed at " + j);
                        }
                    }
                    pattern += str[j++];
                }
                if (count)
                    throw new TypeError("Unbalanced pattern at " + i);
                if (!pattern)
                    throw new TypeError("Missing pattern at " + i);
                tokens.push({ type: "PATTERN", index: i, value: pattern });
                i = j;
                continue;
            }
            tokens.push({ type: "CHAR", index: i, value: str[i++] });
        }
        tokens.push({ type: "END", index: i, value: "" });
        return tokens;
    }
    /**
     * Parse a string for the raw tokens.
     */
    function parse(str, options) {
        if (options === void 0) { options = {}; }
        var tokens = lexer(str);
        var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
        var defaultPattern = "[^" + escapeString(options.delimiter || "/#?") + "]+?";
        var result = [];
        var key = 0;
        var i = 0;
        var path = "";
        var tryConsume = function (type) {
            if (i < tokens.length && tokens[i].type === type)
                return tokens[i++].value;
        };
        var mustConsume = function (type) {
            var value = tryConsume(type);
            if (value !== undefined)
                return value;
            var _a = tokens[i], nextType = _a.type, index = _a.index;
            throw new TypeError("Unexpected " + nextType + " at " + index + ", expected " + type);
        };
        var consumeText = function () {
            var result = "";
            var value;
            // tslint:disable-next-line
            while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
                result += value;
            }
            return result;
        };
        while (i < tokens.length) {
            var char = tryConsume("CHAR");
            var name = tryConsume("NAME");
            var pattern = tryConsume("PATTERN");
            if (name || pattern) {
                var prefix = char || "";
                if (prefixes.indexOf(prefix) === -1) {
                    path += prefix;
                    prefix = "";
                }
                if (path) {
                    result.push(path);
                    path = "";
                }
                result.push({
                    name: name || key++,
                    prefix: prefix,
                    suffix: "",
                    pattern: pattern || defaultPattern,
                    modifier: tryConsume("MODIFIER") || ""
                });
                continue;
            }
            var value = char || tryConsume("ESCAPED_CHAR");
            if (value) {
                path += value;
                continue;
            }
            if (path) {
                result.push(path);
                path = "";
            }
            var open = tryConsume("OPEN");
            if (open) {
                var prefix = consumeText();
                var name_1 = tryConsume("NAME") || "";
                var pattern_1 = tryConsume("PATTERN") || "";
                var suffix = consumeText();
                mustConsume("CLOSE");
                result.push({
                    name: name_1 || (pattern_1 ? key++ : ""),
                    pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
                    prefix: prefix,
                    suffix: suffix,
                    modifier: tryConsume("MODIFIER") || ""
                });
                continue;
            }
            mustConsume("END");
        }
        return result;
    }
    /**
     * Escape a regular expression string.
     */
    function escapeString(str) {
        return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
    }
    /**
     * Get the flags for a regexp from the options.
     */
    function flags(options) {
        return options && options.sensitive ? "" : "i";
    }
    /**
     * Pull out keys from a regexp.
     */
    function regexpToRegexp(path, keys) {
        if (!keys)
            return path;
        // Use a negative lookahead to match only capturing groups.
        var groups = path.source.match(/\((?!\?)/g);
        if (groups) {
            for (var i = 0; i < groups.length; i++) {
                keys.push({
                    name: i,
                    prefix: "",
                    suffix: "",
                    modifier: "",
                    pattern: ""
                });
            }
        }
        return path;
    }
    /**
     * Transform an array into a regexp.
     */
    function arrayToRegexp(paths, keys, options) {
        var parts = paths.map(function (path) { return pathToRegexp(path, keys, options).source; });
        return new RegExp("(?:" + parts.join("|") + ")", flags(options));
    }
    /**
     * Create a path regexp from string input.
     */
    function stringToRegexp(path, keys, options) {
        return tokensToRegexp(parse(path, options), keys, options);
    }
    /**
     * Expose a function for taking tokens and returning a RegExp.
     */
    function tokensToRegexp(tokens, keys, options) {
        if (options === void 0) { options = {}; }
        var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function (x) { return x; } : _d;
        var endsWith = "[" + escapeString(options.endsWith || "") + "]|$";
        var delimiter = "[" + escapeString(options.delimiter || "/#?") + "]";
        var route = start ? "^" : "";
        // Iterate over the tokens and create our regexp string.
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var token = tokens_1[_i];
            if (typeof token === "string") {
                route += escapeString(encode(token));
            }
            else {
                var prefix = escapeString(encode(token.prefix));
                var suffix = escapeString(encode(token.suffix));
                if (token.pattern) {
                    if (keys)
                        keys.push(token);
                    if (prefix || suffix) {
                        if (token.modifier === "+" || token.modifier === "*") {
                            var mod = token.modifier === "*" ? "?" : "";
                            route += "(?:" + prefix + "((?:" + token.pattern + ")(?:" + suffix + prefix + "(?:" + token.pattern + "))*)" + suffix + ")" + mod;
                        }
                        else {
                            route += "(?:" + prefix + "(" + token.pattern + ")" + suffix + ")" + token.modifier;
                        }
                    }
                    else {
                        route += "(" + token.pattern + ")" + token.modifier;
                    }
                }
                else {
                    route += "(?:" + prefix + suffix + ")" + token.modifier;
                }
            }
        }
        if (end) {
            if (!strict)
                route += delimiter + "?";
            route += !options.endsWith ? "$" : "(?=" + endsWith + ")";
        }
        else {
            var endToken = tokens[tokens.length - 1];
            var isEndDelimited = typeof endToken === "string"
                ? delimiter.indexOf(endToken[endToken.length - 1]) > -1
                : // tslint:disable-next-line
                    endToken === undefined;
            if (!strict) {
                route += "(?:" + delimiter + "(?=" + endsWith + "))?";
            }
            if (!isEndDelimited) {
                route += "(?=" + delimiter + "|" + endsWith + ")";
            }
        }
        return new RegExp(route, flags(options));
    }
    /**
     * Normalize the given path string, returning a regular expression.
     *
     * An empty array can be passed in for the keys, which will hold the
     * placeholder key descriptions. For example, using `/user/:id`, `keys` will
     * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
     */
    function pathToRegexp(path, keys, options) {
        if (path instanceof RegExp)
            return regexpToRegexp(path, keys);
        if (Array.isArray(path))
            return arrayToRegexp(path, keys, options);
        return stringToRegexp(path, keys, options);
    }

    var LEADING_DELIMITER = /^[\\\/]+/;
    var TRAILING_DELIMITER = /[\\\/]+$/;
    var DELIMITER_NOT_IN_PARENTHESES = /[\\\/]+(?![^(]*[)])/g;
    function prepare(path) {
        return path.replace(LEADING_DELIMITER, "").replace(TRAILING_DELIMITER, "").replace(DELIMITER_NOT_IN_PARENTHESES, "/");
    }
    function generate(path, keys) {
        if (Array.isArray(path)) {
            path.map(function (value) {
                if (typeof value === "string") {
                    return prepare(value);
                }
                return value;
            });
        }
        if (typeof path === "string") {
            path = prepare(path);
        }
        return pathToRegexp(path, keys);
    }

    var PathGenerator = /*#__PURE__*/Object.freeze({
        __proto__: null,
        prepare: prepare,
        generate: generate
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
                var _b = __read(_a, 2), c = _b[0], hrefs = _b[1];
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
                for (var _b = __values(this._contexts.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), context = _d[0], _e = __read(_d[1], 1), hrefs = _e[0];
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
                var _b = __read(_a, 2), c = _b[0], hrefs = _b[1];
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
            var pathRegexp = generate(path);
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
                var _b = __read(_a, 2), c = _b[0], c_hrefs = _b[1];
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

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var strictUriEncode = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

    var token = '%[a-f0-9]{2}';
    var singleMatcher = new RegExp(token, 'gi');
    var multiMatcher = new RegExp('(' + token + ')+', 'gi');

    function decodeComponents(components, split) {
    	try {
    		// Try to decode the entire string first
    		return decodeURIComponent(components.join(''));
    	} catch (err) {
    		// Do nothing
    	}

    	if (components.length === 1) {
    		return components;
    	}

    	split = split || 1;

    	// Split the array in 2 parts
    	var left = components.slice(0, split);
    	var right = components.slice(split);

    	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
    }

    function decode(input) {
    	try {
    		return decodeURIComponent(input);
    	} catch (err) {
    		var tokens = input.match(singleMatcher);

    		for (var i = 1; i < tokens.length; i++) {
    			input = decodeComponents(tokens, i).join('');

    			tokens = input.match(singleMatcher);
    		}

    		return input;
    	}
    }

    function customDecodeURIComponent(input) {
    	// Keep track of all the replacements and prefill the map with the `BOM`
    	var replaceMap = {
    		'%FE%FF': '\uFFFD\uFFFD',
    		'%FF%FE': '\uFFFD\uFFFD'
    	};

    	var match = multiMatcher.exec(input);
    	while (match) {
    		try {
    			// Decode as big chunks as possible
    			replaceMap[match[0]] = decodeURIComponent(match[0]);
    		} catch (err) {
    			var result = decode(match[0]);

    			if (result !== match[0]) {
    				replaceMap[match[0]] = result;
    			}
    		}

    		match = multiMatcher.exec(input);
    	}

    	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
    	replaceMap['%C2'] = '\uFFFD';

    	var entries = Object.keys(replaceMap);

    	for (var i = 0; i < entries.length; i++) {
    		// Replace all decoded components
    		var key = entries[i];
    		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
    	}

    	return input;
    }

    var decodeUriComponent = function (encodedURI) {
    	if (typeof encodedURI !== 'string') {
    		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
    	}

    	try {
    		encodedURI = encodedURI.replace(/\+/g, ' ');

    		// Try the built in decoder first
    		return decodeURIComponent(encodedURI);
    	} catch (err) {
    		// Fallback to a more advanced decoder
    		return customDecodeURIComponent(encodedURI);
    	}
    };

    var splitOnFirst = (string, separator) => {
    	if (!(typeof string === 'string' && typeof separator === 'string')) {
    		throw new TypeError('Expected the arguments to be of type `string`');
    	}

    	if (separator === '') {
    		return [string];
    	}

    	const separatorIndex = string.indexOf(separator);

    	if (separatorIndex === -1) {
    		return [string];
    	}

    	return [
    		string.slice(0, separatorIndex),
    		string.slice(separatorIndex + separator.length)
    	];
    };

    var queryString = createCommonjsModule(function (module, exports) {




    const isNullOrUndefined = value => value === null || value === undefined;

    function encoderForArrayFormat(options) {
    	switch (options.arrayFormat) {
    		case 'index':
    			return key => (result, value) => {
    				const index = result.length;

    				if (
    					value === undefined ||
    					(options.skipNull && value === null) ||
    					(options.skipEmptyString && value === '')
    				) {
    					return result;
    				}

    				if (value === null) {
    					return [...result, [encode(key, options), '[', index, ']'].join('')];
    				}

    				return [
    					...result,
    					[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join('')
    				];
    			};

    		case 'bracket':
    			return key => (result, value) => {
    				if (
    					value === undefined ||
    					(options.skipNull && value === null) ||
    					(options.skipEmptyString && value === '')
    				) {
    					return result;
    				}

    				if (value === null) {
    					return [...result, [encode(key, options), '[]'].join('')];
    				}

    				return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
    			};

    		case 'comma':
    		case 'separator':
    			return key => (result, value) => {
    				if (value === null || value === undefined || value.length === 0) {
    					return result;
    				}

    				if (result.length === 0) {
    					return [[encode(key, options), '=', encode(value, options)].join('')];
    				}

    				return [[result, encode(value, options)].join(options.arrayFormatSeparator)];
    			};

    		default:
    			return key => (result, value) => {
    				if (
    					value === undefined ||
    					(options.skipNull && value === null) ||
    					(options.skipEmptyString && value === '')
    				) {
    					return result;
    				}

    				if (value === null) {
    					return [...result, encode(key, options)];
    				}

    				return [...result, [encode(key, options), '=', encode(value, options)].join('')];
    			};
    	}
    }

    function parserForArrayFormat(options) {
    	let result;

    	switch (options.arrayFormat) {
    		case 'index':
    			return (key, value, accumulator) => {
    				result = /\[(\d*)\]$/.exec(key);

    				key = key.replace(/\[\d*\]$/, '');

    				if (!result) {
    					accumulator[key] = value;
    					return;
    				}

    				if (accumulator[key] === undefined) {
    					accumulator[key] = {};
    				}

    				accumulator[key][result[1]] = value;
    			};

    		case 'bracket':
    			return (key, value, accumulator) => {
    				result = /(\[\])$/.exec(key);
    				key = key.replace(/\[\]$/, '');

    				if (!result) {
    					accumulator[key] = value;
    					return;
    				}

    				if (accumulator[key] === undefined) {
    					accumulator[key] = [value];
    					return;
    				}

    				accumulator[key] = [].concat(accumulator[key], value);
    			};

    		case 'comma':
    		case 'separator':
    			return (key, value, accumulator) => {
    				const isArray = typeof value === 'string' && value.split('').indexOf(options.arrayFormatSeparator) > -1;
    				const newValue = isArray ? value.split(options.arrayFormatSeparator).map(item => decode(item, options)) : value === null ? value : decode(value, options);
    				accumulator[key] = newValue;
    			};

    		default:
    			return (key, value, accumulator) => {
    				if (accumulator[key] === undefined) {
    					accumulator[key] = value;
    					return;
    				}

    				accumulator[key] = [].concat(accumulator[key], value);
    			};
    	}
    }

    function validateArrayFormatSeparator(value) {
    	if (typeof value !== 'string' || value.length !== 1) {
    		throw new TypeError('arrayFormatSeparator must be single character string');
    	}
    }

    function encode(value, options) {
    	if (options.encode) {
    		return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
    	}

    	return value;
    }

    function decode(value, options) {
    	if (options.decode) {
    		return decodeUriComponent(value);
    	}

    	return value;
    }

    function keysSorter(input) {
    	if (Array.isArray(input)) {
    		return input.sort();
    	}

    	if (typeof input === 'object') {
    		return keysSorter(Object.keys(input))
    			.sort((a, b) => Number(a) - Number(b))
    			.map(key => input[key]);
    	}

    	return input;
    }

    function removeHash(input) {
    	const hashStart = input.indexOf('#');
    	if (hashStart !== -1) {
    		input = input.slice(0, hashStart);
    	}

    	return input;
    }

    function getHash(url) {
    	let hash = '';
    	const hashStart = url.indexOf('#');
    	if (hashStart !== -1) {
    		hash = url.slice(hashStart);
    	}

    	return hash;
    }

    function extract(input) {
    	input = removeHash(input);
    	const queryStart = input.indexOf('?');
    	if (queryStart === -1) {
    		return '';
    	}

    	return input.slice(queryStart + 1);
    }

    function parseValue(value, options) {
    	if (options.parseNumbers && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
    		value = Number(value);
    	} else if (options.parseBooleans && value !== null && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
    		value = value.toLowerCase() === 'true';
    	}

    	return value;
    }

    function parse(input, options) {
    	options = Object.assign({
    		decode: true,
    		sort: true,
    		arrayFormat: 'none',
    		arrayFormatSeparator: ',',
    		parseNumbers: false,
    		parseBooleans: false
    	}, options);

    	validateArrayFormatSeparator(options.arrayFormatSeparator);

    	const formatter = parserForArrayFormat(options);

    	// Create an object with no prototype
    	const ret = Object.create(null);

    	if (typeof input !== 'string') {
    		return ret;
    	}

    	input = input.trim().replace(/^[?#&]/, '');

    	if (!input) {
    		return ret;
    	}

    	for (const param of input.split('&')) {
    		let [key, value] = splitOnFirst(options.decode ? param.replace(/\+/g, ' ') : param, '=');

    		// Missing `=` should be `null`:
    		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
    		value = value === undefined ? null : ['comma', 'separator'].includes(options.arrayFormat) ? value : decode(value, options);
    		formatter(decode(key, options), value, ret);
    	}

    	for (const key of Object.keys(ret)) {
    		const value = ret[key];
    		if (typeof value === 'object' && value !== null) {
    			for (const k of Object.keys(value)) {
    				value[k] = parseValue(value[k], options);
    			}
    		} else {
    			ret[key] = parseValue(value, options);
    		}
    	}

    	if (options.sort === false) {
    		return ret;
    	}

    	return (options.sort === true ? Object.keys(ret).sort() : Object.keys(ret).sort(options.sort)).reduce((result, key) => {
    		const value = ret[key];
    		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
    			// Sort object keys, not values
    			result[key] = keysSorter(value);
    		} else {
    			result[key] = value;
    		}

    		return result;
    	}, Object.create(null));
    }

    exports.extract = extract;
    exports.parse = parse;

    exports.stringify = (object, options) => {
    	if (!object) {
    		return '';
    	}

    	options = Object.assign({
    		encode: true,
    		strict: true,
    		arrayFormat: 'none',
    		arrayFormatSeparator: ','
    	}, options);

    	validateArrayFormatSeparator(options.arrayFormatSeparator);

    	const shouldFilter = key => (
    		(options.skipNull && isNullOrUndefined(object[key])) ||
    		(options.skipEmptyString && object[key] === '')
    	);

    	const formatter = encoderForArrayFormat(options);

    	const objectCopy = {};

    	for (const key of Object.keys(object)) {
    		if (!shouldFilter(key)) {
    			objectCopy[key] = object[key];
    		}
    	}

    	const keys = Object.keys(objectCopy);

    	if (options.sort !== false) {
    		keys.sort(options.sort);
    	}

    	return keys.map(key => {
    		const value = object[key];

    		if (value === undefined) {
    			return '';
    		}

    		if (value === null) {
    			return encode(key, options);
    		}

    		if (Array.isArray(value)) {
    			return value
    				.reduce(formatter(key), [])
    				.join('&');
    		}

    		return encode(key, options) + '=' + encode(value, options);
    	}).filter(x => x.length > 0).join('&');
    };

    exports.parseUrl = (input, options) => {
    	options = Object.assign({
    		decode: true
    	}, options);

    	const [url, hash] = splitOnFirst(input, '#');

    	return Object.assign(
    		{
    			url: url.split('?')[0] || '',
    			query: parse(extract(input), options)
    		},
    		options && options.parseFragmentIdentifier && hash ? {fragmentIdentifier: decode(hash, options)} : {}
    	);
    };

    exports.stringifyUrl = (input, options) => {
    	options = Object.assign({
    		encode: true,
    		strict: true
    	}, options);

    	const url = removeHash(input.url).split('?')[0] || '';
    	const queryFromUrl = exports.extract(input.url);
    	const parsedQueryFromUrl = exports.parse(queryFromUrl, {sort: false});

    	const query = Object.assign(parsedQueryFromUrl, input.query);
    	let queryString = exports.stringify(query, options);
    	if (queryString) {
    		queryString = `?${queryString}`;
    	}

    	let hash = getHash(input.url);
    	if (input.fragmentIdentifier) {
    		hash = `#${encode(input.fragmentIdentifier, options)}`;
    	}

    	return `${url}${queryString}${hash}`;
    };
    });

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
        return queryString.stringify(filteredOpts);
    }
    function get() {
        return queryString.parse(splitHref()[1]);
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

    var OptionsManager = /*#__PURE__*/Object.freeze({
        __proto__: null,
        get: get,
        set: set,
        add: add,
        remove: remove,
        goWith: goWith,
        clearHref: clearHref
    });

    var BASE = window.location.href.split("#")[0] + "#";
    function base(value) {
        if (value != null) {
            BASE = value;
        }
        return BASE;
    }
    function get$1() {
        return prepare(clearHref().split(BASE).slice(1).join(BASE));
    }
    function construct(href) {
        switch (href[0]) {
            case "?": {
                href = get$1().split("?")[0] + href;
                break;
            }
            case "#": {
                href = get$1().split("#")[0] + href;
                break;
            }
        }
        return BASE + href;
    }

    var URLManager = /*#__PURE__*/Object.freeze({
        __proto__: null,
        base: base,
        get: get$1,
        construct: construct
    });

    var started = false;
    var works = [];
    var onworkfinished = [];
    function onWorkFinished(callback, context) {
        if (works.length === 0) {
            callback.call(context || null);
            return;
        }
        onworkfinished.push([callback, context || null]);
    }
    function createWork(locking) {
        if (locking === void 0) { locking = false; }
        var finished = false;
        var finishing = false;
        var work = {
            get locking() {
                return locking;
            },
            get finished() {
                return finished;
            },
            get finishing() {
                return finishing;
            },
            finish: function () {
                if (finished) {
                    return;
                }
                finished = true;
                finishing = false;
                var i = works.length - 1;
                for (; i >= 0; i--) {
                    if (works[i] === work) {
                        works.splice(i, 1);
                        break;
                    }
                }
                if (i >= 0 && works.length === 0) {
                    while (onworkfinished.length > 0 && works.length === 0) {
                        var _a = __read(onworkfinished.shift(), 2), callback = _a[0], context = _a[1];
                        callback.call(context || window);
                    }
                }
            },
            beginFinish: function () {
                finishing = true;
            },
            askFinish: function () {
                return false;
            }
        };
        works.push(work);
        return work;
    }
    function acquire() {
        var lock = createWork(true);
        return lock;
    }
    function isLocked() {
        return works.some(function (w) { return w.locking; });
    }
    var catchPopState$1 = null;
    window.addEventListener("popstate", function (event) {
        if (!started || isLocked()) {
            return;
        }
        if (catchPopState$1 == null) {
            handlePopState();
            return;
        }
        event.stopImmediatePropagation();
        catchPopState$1();
    }, true);
    function onCatchPopState$1(onCatchPopState, once) {
        if (once === void 0) { once = false; }
        if (once) {
            var tmpOnCatchPopState_1 = onCatchPopState;
            onCatchPopState = function () {
                catchPopState$1 = null;
                tmpOnCatchPopState_1();
            };
        }
        catchPopState$1 = onCatchPopState;
    }
    function goTo$1(href, replace) {
        if (replace === void 0) { replace = false; }
        href = construct(href);
        if (window.location.href === href) {
            window.dispatchEvent(new Event("popstate"));
            return;
        }
        if (replace) {
            window.location.replace(href);
        }
        else {
            window.location.assign(href);
        }
    }
    function addFront(frontHref) {
        if (frontHref === void 0) { frontHref = "next"; }
        var href = get$1();
        var work = createWork();
        return new Promise(function (resolve) {
            goWith(construct(frontHref), { back: undefined, front: null })
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState$1(resolve, true);
                window.history.go(-1);
            }); })
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState$1(resolve, true);
                goTo$1(href, true);
            }); })
                .then(function () {
                work.finish();
                resolve();
            });
        });
    }
    function addBack(backHref) {
        if (backHref === void 0) { backHref = ""; }
        var href = get$1();
        var work = createWork();
        return new Promise(function (resolve) {
            (new Promise(function (resolve) {
                onCatchPopState$1(resolve, true);
                window.history.go(-1);
            }))
                .then(function () { return new Promise(function (resolve) {
                if (backHref) {
                    onCatchPopState$1(resolve, true);
                    goTo$1(backHref, true);
                }
                else {
                    resolve();
                }
            }); })
                .then(function () { return set({ back: null, front: undefined }); })
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState$1(resolve, true);
                goTo$1(href);
            }); })
                .then(function () {
                work.finish();
                resolve();
            });
        });
    }
    var hasBack = false;
    var contextManager = new ContextManager();
    function index() {
        return contextManager.index();
    }
    function getHREFAt(index) {
        return contextManager.get(index);
    }
    function setContext(context) {
        return contextManager.setContext(context);
    }
    function addContextPath(context, href, isFallback) {
        if (isFallback === void 0) { isFallback = false; }
        return contextManager.addContextPath(context, href, isFallback);
    }
    function setContextDefaultHref(context, href) {
        return contextManager.setContextDefaultHref(context, href);
    }
    function getContext(href) {
        if (href === void 0) { href = null; }
        if (href == null) {
            return contextManager.currentContext();
        }
        return contextManager.contextOf(href);
    }
    function getHREFs() {
        return contextManager.hrefs();
    }
    function tryUnlock() {
        var locksAsked = 0;
        for (var i = works.length - 1; i >= 0; i--) {
            var work = works[i];
            if (work.locking && !work.finishing) {
                if (!work.askFinish()) {
                    return -1;
                }
                locksAsked++;
            }
        }
        return locksAsked;
    }
    var workToRelease = null;
    function restore(context) {
        var locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise(function (_, reject) { reject(); });
        }
        var promiseResolve;
        var promise = new Promise(function (resolve) { promiseResolve = resolve; });
        onWorkFinished(function () {
            var previousIndex = contextManager.index();
            if (contextManager.restore(context)) {
                var replace_1 = previousIndex >= contextManager.index();
                workToRelease = createWork();
                onWorkFinished(promiseResolve);
                var href_1 = contextManager.get();
                var hadBack_1 = hasBack;
                (new Promise(function (resolve) {
                    if (!replace_1 && !hasBack) {
                        onCatchPopState$1(resolve, true);
                        goTo$1(href_1);
                    }
                    else {
                        resolve();
                    }
                }))
                    .then(function () { return new Promise(function (resolve) {
                    var index = contextManager.index() - 1;
                    if (replace_1 && !hasBack) {
                        resolve();
                    }
                    else {
                        addBack(contextManager.get(index))
                            .then(function () {
                            hasBack = true;
                            resolve();
                        });
                    }
                }); })
                    .then(function () { return new Promise(function (resolve) {
                    if (hadBack_1 || replace_1) {
                        onCatchPopState$1(resolve, true);
                        goTo$1(href_1, true);
                    }
                    else {
                        resolve();
                    }
                }); })
                    .then(onlanded);
            }
            else {
                promiseResolve();
            }
        });
        return promise;
    }
    function assign(href) {
        var locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise(function (_, reject) { reject(); });
        }
        var promiseResolve;
        var promise = new Promise(function (resolve) { promiseResolve = resolve; });
        onWorkFinished(function () {
            workToRelease = createWork();
            onWorkFinished(promiseResolve);
            goTo$1(href);
        });
        return promise;
    }
    var replacing = false;
    function replace(href) {
        var locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise(function (_, reject) { reject(); });
        }
        var promiseResolve;
        var promise = new Promise(function (resolve) { promiseResolve = resolve; });
        onWorkFinished(function () {
            workToRelease = createWork();
            onWorkFinished(promiseResolve);
            goTo$1(href, replacing = true);
        });
        return promise;
    }
    function go(direction) {
        var locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise(function (resolve, reject) {
                reject();
            });
        }
        if (direction === 0) {
            throw new Error("direction must be different than 0");
        }
        direction = parseInt(direction, 10) + locksFinished;
        if (isNaN(direction)) {
            throw new Error("direction must be a number");
        }
        if (direction === 0) {
            return Promise.resolve();
        }
        var promiseResolve;
        var promise = new Promise(function (resolve, reject) { promiseResolve = resolve; });
        onWorkFinished(function () {
            var index = contextManager.index() + direction;
            if (index < 0 || index >= contextManager.length()) {
                return onlanded();
            }
            workToRelease = createWork();
            onWorkFinished(promiseResolve);
            if (direction > 0) {
                contextManager.index(index - 1);
                window.history.go(1);
            }
            else {
                contextManager.index(index + 1);
                window.history.go(-1);
            }
        });
        return promise;
    }
    function start(fallbackContext) {
        if (fallbackContext === void 0) { fallbackContext = contextManager.getContextNames()[0]; }
        var href = get$1();
        var context = contextManager.contextOf(href, false);
        if (context == null) {
            if (!fallbackContext) {
                throw new Error("must define a fallback context");
            }
            var defaultHREF = contextManager.getDefaultOf(fallbackContext);
            if (defaultHREF == null) {
                throw new Error("must define a default href for the fallback context");
            }
            started = true;
            href = defaultHREF;
            workToRelease = createWork();
            onCatchPopState$1(onlanded, true);
            goTo$1(defaultHREF, true);
        }
        contextManager.insert(href);
        if (context != null) {
            started = true;
            onlanded();
        }
    }
    function onlanded() {
        window.dispatchEvent(new Event("historylanded"));
        if (workToRelease != null) {
            var work = workToRelease;
            workToRelease = null;
            work.finish();
        }
    }
    function handlePopState() {
        var options = get();
        if (options.locked) {
            onCatchPopState$1(function () {
                if (get().locked) {
                    handlePopState();
                }
            }, true);
            window.history.go(-1);
            return;
        }
        if (options.front !== undefined) {
            var frontEvent = new Event("historyforward", { cancelable: true });
            window.dispatchEvent(frontEvent);
            if (frontEvent.defaultPrevented) {
                onCatchPopState$1(function () { return; }, true);
                window.history.go(-1);
                return;
            }
            var backHref = contextManager.get();
            var href_2 = contextManager.goForward();
            (new Promise(function (resolve) {
                if (hasBack) {
                    onCatchPopState$1(resolve, true);
                    window.history.go(-1);
                }
                else {
                    resolve();
                }
            }))
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState$1(resolve, true);
                goTo$1(href_2, true);
            }); })
                .then(addBack.bind(null, backHref))
                .then(function () { return new Promise(function (resolve) {
                if (contextManager.index() < contextManager.length() - 1) {
                    onCatchPopState$1(resolve, true);
                    addFront(contextManager.get(contextManager.index() + 1)).then(resolve);
                }
                else {
                    resolve();
                }
            }); })
                .then(function () {
                hasBack = true;
                onlanded();
            });
        }
        else if (options.back !== undefined) {
            var backEvent = new Event("historybackward", { cancelable: true });
            window.dispatchEvent(backEvent);
            if (backEvent.defaultPrevented) {
                onCatchPopState$1(function () { return; }, true);
                window.history.go(+1);
                return;
            }
            var frontHref = contextManager.get();
            var href_3 = contextManager.goBackward();
            (new Promise(function (resolve) {
                if (contextManager.index() > 0) {
                    onCatchPopState$1(resolve, true);
                    window.history.go(1);
                }
                else {
                    resolve();
                }
            })).then(function () { return new Promise(function (resolve) {
                onCatchPopState$1(resolve, true);
                goTo$1(href_3, true);
            }); })
                .then(addFront.bind(null, frontHref))
                .then(function () {
                hasBack = contextManager.index() > 0;
                onlanded();
            });
        }
        else {
            var href_4 = get$1();
            var backHref_1 = contextManager.get();
            if (href_4 === backHref_1) {
                return onlanded();
            }
            var replaced_1 = replacing;
            replacing = false;
            var willHaveBack_1 = hasBack || !replaced_1;
            contextManager.insert(href_4, replaced_1);
            (new Promise(function (resolve) {
                if (hasBack && !replaced_1) {
                    onCatchPopState$1(resolve, true);
                    window.history.go(-1);
                }
                else {
                    resolve();
                }
            }))
                .then(function () {
                if (replaced_1) {
                    return Promise.resolve();
                }
                return addBack(backHref_1);
            })
                .then(function () { return new Promise(function (resolve) {
                onCatchPopState$1(resolve, true);
                goTo$1(href_4, true);
            }); })
                .then(function () {
                hasBack = willHaveBack_1;
                onlanded();
            });
        }
    }

    var HistoryManager = /*#__PURE__*/Object.freeze({
        __proto__: null,
        onWorkFinished: onWorkFinished,
        acquire: acquire,
        addFront: addFront,
        addBack: addBack,
        index: index,
        getHREFAt: getHREFAt,
        setContext: setContext,
        addContextPath: addContextPath,
        setContextDefaultHref: setContextDefaultHref,
        getContext: getContext,
        getHREFs: getHREFs,
        restore: restore,
        assign: assign,
        replace: replace,
        go: go,
        start: start
    });

    var locks = [];
    var catchPopState$2 = null;
    window.addEventListener("popstate", function (event) {
        if (catchPopState$2 == null) {
            return handlePopState$1();
        }
        event.stopImmediatePropagation();
        catchPopState$2();
    }, true);
    function onCatchPopState$2(onCatchPopState, once) {
        if (once === void 0) { once = false; }
        if (once) {
            var tmpOnCatchPopState_1 = onCatchPopState;
            onCatchPopState = function () {
                catchPopState$2 = null;
                tmpOnCatchPopState_1();
            };
        }
        catchPopState$2 = onCatchPopState;
    }
    function lock() {
        var delegate = new EventTarget();
        var id = Date.now();
        var historyLock;
        var promiseResolve;
        var promise = new Promise(function (resolve) {
            promiseResolve = resolve;
        });
        onWorkFinished(function () {
            historyLock = acquire();
            var lock = {
                lock: {
                    get id() {
                        return id;
                    },
                    listen: function (listener) {
                        delegate.addEventListener("navigation", listener);
                    },
                    unlisten: function (listener) {
                        delegate.removeEventListener("navigation", listener);
                    },
                    unlock: function () {
                        if (!locks.length || historyLock.finishing) {
                            return;
                        }
                        promise.then(function () {
                            if (locks[locks.length - 1].lock.id === id) {
                                unlock();
                            }
                            else {
                                locks.some(function (lock, index) {
                                    if (lock.lock.id === id) {
                                        locks.splice(index, 1)[0].release();
                                    }
                                    return false;
                                });
                            }
                        });
                    }
                },
                fire: function () {
                    var e = new Event("navigation", { cancelable: true });
                    delegate.dispatchEvent(e);
                    return e.defaultPrevented;
                },
                release: function () {
                    historyLock.finish();
                },
                beginRelease: function (start_fn) {
                    historyLock.beginFinish();
                    promise.then(function () {
                        start_fn();
                    });
                }
            };
            historyLock.askFinish = function () {
                if (!lock.fire()) {
                    return false;
                }
                lock.lock.unlock();
                return true;
            };
            locks.push(lock);
            goWith(clearHref(), __assign(__assign({}, get()), { locked: lock.lock.id })).then(function () {
                promiseResolve(lock.lock);
            });
        });
        return promise;
    }
    function unlock(force) {
        if (force === void 0) { force = true; }
        var wrapper = locks.splice(locks.length - 1, 1)[0];
        if (wrapper == null) {
            return true;
        }
        if (!force && !wrapper.fire()) {
            return false;
        }
        wrapper.beginRelease(function () {
            onCatchPopState$2(function () {
                wrapper.release();
            }, true);
            window.history.go(-1);
        });
        return true;
    }
    function locked() {
        return locks.length > 0;
    }
    var shouldUnlock = false;
    function handlePopState$1() {
        if (locks.length === 0) {
            return;
        }
        var lockId = parseInt(get().locked, 10);
        if (isNaN(lockId)) {
            shouldUnlock = true;
            window.history.go(1);
        }
        else {
            var lock_1 = locks[locks.length - 1];
            if (lockId === lock_1.lock.id) {
                if (shouldUnlock && lock_1.fire()) {
                    unlock();
                }
                shouldUnlock = false;
                return;
            }
            else if (lockId > lock_1.lock.id) {
                window.history.go(-1);
            }
            else {
                shouldUnlock = true;
                window.history.go(1);
            }
        }
    }

    var NavigationLock = /*#__PURE__*/Object.freeze({
        __proto__: null,
        lock: lock,
        unlock: unlock,
        locked: locked
    });

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
        if (href === void 0) { href = get$1(); }
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
    function start$1(startingContext) {
        return start(startingContext);
    }
    function index$1() {
        return index();
    }
    function getLocationAt(index) {
        var href = getHREFAt(index);
        if (href == null) {
            return null;
        }
        return getLocation(href);
    }
    function addContextPath$1(context, href, isFallback) {
        if (isFallback === void 0) { isFallback = false; }
        return addContextPath(context, href, isFallback);
    }
    function setContextDefaultHref$1(context, href) {
        return setContextDefaultHref(context, href);
    }
    function setContext$1(context) {
        return setContext(context);
    }
    function getContext$1(href) {
        return getContext(href);
    }
    function restoreContext(context, defaultHref) {
        return restore(context);
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
    function go$1(path_index, options) {
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
                go(path_index).then(promiseResolve, function () {
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
            go$1(location.href, options).then(promiseResolve);
        });
        return promise;
    }
    function lock$1() {
        return lock();
    }
    function unlock$1(force) {
        if (force === void 0) { force = true; }
        return unlock(force);
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
    function isLocked$1() {
        return locked();
    }

    var Router = /*#__PURE__*/Object.freeze({
        __proto__: null,
        getLocation: getLocation,
        redirect: redirect,
        unredirect: unredirect,
        route: route,
        unroute: unroute,
        start: start$1,
        index: index$1,
        getLocationAt: getLocationAt,
        addContextPath: addContextPath$1,
        setContextDefaultHref: setContextDefaultHref$1,
        setContext: setContext$1,
        getContext: getContext$1,
        restoreContext: restoreContext,
        emit: emit,
        create: create,
        go: go$1,
        setQueryParam: setQueryParam,
        lock: lock$1,
        unlock: unlock$1,
        destroy: destroy,
        getBase: getBase,
        setBase: setBase,
        isLocked: isLocked$1,
        NavigationLock: NavigationLock
    });

    var locks$1 = [];
    function lock$2(locking_fn) {
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
                var i = locks$1.length - 1;
                for (; i >= 0; i--) {
                    if (locks$1[i] === lock) {
                        locks$1.splice(i, 1);
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
                locks$1.push(lock);
                if (result !== false && result !== void 0) {
                    lock.release();
                }
                resolve(lock);
            });
        });
    }
    function locked$1() {
        return locks$1.length > 0 && locks$1.every(function (lock) { return !lock.releasing && !lock.released; });
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
        if (locked$1()) {
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
        lock: lock$2,
        locked: locked$1,
        startWork: startWork,
        ondone: ondone
    });

    exports.ContextManager = ContextManager$1;
    exports.HistoryManager = HistoryManager;
    exports.NavigationLock = NavigationLock;
    exports.OptionsManager = OptionsManager;
    exports.PathGenerator = PathGenerator;
    exports.Router = Router;
    exports.URLManager = URLManager;
    exports.WorkManager = WorkManager;

    Object.defineProperty(exports, '__esModule', { value: true });

});
//# sourceMappingURL=history-manager.js.map
