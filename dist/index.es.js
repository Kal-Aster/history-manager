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
    var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
    var index = 0;
    var execResult = groupsRegex.exec(path.source);
    while (execResult) {
        keys.push({
            // Use parenthesized substring match if available, index otherwise
            name: execResult[1] || index++,
            prefix: "",
            suffix: "",
            modifier: "",
            pattern: ""
        });
        execResult = groupsRegex.exec(path.source);
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

/**
 * @author Giuliano Collacchioni @2020
 */
const LEADING_DELIMITER = /^[\\\/]+/;
const TRAILING_DELIMITER = /[\\\/]+$/;
const DELIMITER_NOT_IN_PARENTHESES = /[\\\/]+(?![^(]*[)])/g;
function prepare(path) {
    return ("/" + path).replace(TRAILING_DELIMITER, "/").replace(DELIMITER_NOT_IN_PARENTHESES, "/");
}
function generate(path, keys) {
    if (Array.isArray(path)) {
        path.map(value => {
            if (typeof value === "string") {
                return prepare(value);
            }
            return value;
        });
    }
    if (typeof path === "string") {
        path = prepare(path);
    }
    return pathToRegexp(path, keys); // , { end: false }); // is this needed?
}

var PathGenerator = /*#__PURE__*/Object.freeze({
    __proto__: null,
    LEADING_DELIMITER: LEADING_DELIMITER,
    TRAILING_DELIMITER: TRAILING_DELIMITER,
    DELIMITER_NOT_IN_PARENTHESES: DELIMITER_NOT_IN_PARENTHESES,
    prepare: prepare,
    generate: generate
});

class ContextManager {
    _contexts = new Map();
    _hrefs = [];
    _index = -1;
    _length = 0;
    /**
     * Removes all references after the actual index
     */
    clean() {
        if (this._index < this._length - 1) {
            let index = this._index;
            let newHREFs = [];
            this._hrefs.some(c_hrefs => {
                let newCHrefs = [];
                let result = c_hrefs[1].some(href => {
                    // if index is still greater or equal to 0
                    // then keep the reference else stop the loop
                    if (index-- >= 0) {
                        newCHrefs.push(href);
                        return false;
                    }
                    return true;
                });
                if (newCHrefs.length) {
                    newHREFs.push([c_hrefs[0], newCHrefs]);
                }
                return result;
            });
            this._hrefs = newHREFs;
            this._length = this._index + 1;
        }
    }
    currentContext() {
        if (this._hrefs.length === 0) {
            return null;
        }
        let index = this._index;
        let context;
        if (this._hrefs.some(([c, hrefs]) => {
            context = c;
            index -= hrefs.length;
            return index < 0;
        })) {
            return context;
        }
        return null;
    }
    contextOf(href, skipFallback = true) {
        let foundContext = null;
        href = href.split("#")[0].split("?")[0];
        for (let [context, [hrefs]] of this._contexts.entries()) {
            if (hrefs.some(c_href => {
                if (c_href.fallback && skipFallback) {
                    return false;
                }
                return c_href.path.test(href);
            })) {
                foundContext = context;
                break;
            }
        }
        return foundContext;
    }
    insert(href, replace = false) {
        href = prepare(href);
        this.clean();
        // console.group(`ContextManager.insert("${href}", ${replace})`);
        // console.log(`current href: ${this.hrefs()}`);
        // get context of href
        let foundContext = this.contextOf(href, this._length > 0);
        // console.log(`found context: ${foundContext}`);
        let previousContext = this._hrefs.length > 0 ? this._hrefs[this._hrefs.length - 1] : null;
        if (foundContext == null) {
            if (this._hrefs.length > 0) {
                this._hrefs[this._hrefs.length - 1][1].push(href);
                this._length++;
                this._index++;
            }
        }
        else {
            let i = -1;
            if (this._hrefs.some((c_hrefs, index) => {
                if (c_hrefs[0] === foundContext) {
                    i = index;
                    return true;
                }
                return false;
            })) {
                let c_hrefs = this._hrefs.splice(i, 1)[0];
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
            let lastContext = this._hrefs[this._hrefs.length - 1];
            // console.log(`current context: ["${ lastContext[0] }", [${ lastContext[1] }]]`);
            if (lastContext === previousContext) {
                if (lastContext[1].length > 1) {
                    do {
                        lastContext[1].splice(-2, 1);
                        this._length--;
                        this._index--;
                    } while (lastContext[1].length > 1 &&
                        lastContext[1][lastContext[1].length - 2] === href);
                    // console.log(`final hrefs: ${ lastContext[1] }`);
                }
            }
            else if (previousContext != null) {
                previousContext[1].splice(-1, 1);
                this._length--;
                this._index--;
            }
        }
        // console.groupEnd();
    }
    goBackward() {
        // console.group("ContextManager.goBackward()");
        // console.log(`current index: ${this._index}`);
        this._index = Math.max(--this._index, 0);
        // console.log(`new index: ${this._index}`);
        // console.groupEnd();
        return this.get();
    }
    goForward() {
        // console.group("ContextManager.goForward()");
        // console.log(`current index: ${this._index}`);
        this._index = Math.min(++this._index, this._length - 1);
        // console.log(`new index: ${this._index}`);
        // console.groupEnd();
        return this.get();
    }
    get(index = this._index) {
        let href;
        if (this._hrefs.some(([c, hrefs]) => {
            let length = hrefs.length;
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
    }
    index(value) {
        if (value === void 0) {
            return this._index;
        }
        value = parseInt(value, 10);
        if (isNaN(value)) {
            throw new Error("value must be a number");
        }
        // console.group(`ContextManager.index(${value})`);
        // console.log(`current hrefs: ${this.hrefs()}`);
        this._index = value;
        // console.groupEnd();
    }
    length() {
        return this._length;
    }
    getContextNames() {
        return Array.from(this._contexts.keys());
    }
    getDefaultOf(context) {
        let c = this._contexts.get(context);
        if (!c) {
            return null;
        }
        let href = c[1];
        if (href == null) {
            return null;
        }
        return href;
    }
    restore(context) {
        let tmpHREFs = this._hrefs;
        this.clean();
        if (this._hrefs.length) {
            let lastContext = this._hrefs[this._hrefs.length - 1];
            if (lastContext[0] === context) {
                let path = this._contexts.get(context)[1] || lastContext[1][0];
                let numPages = lastContext[1].splice(1).length;
                this._length -= numPages;
                this._index -= numPages;
                lastContext[1][0] = path;
                return true;
            }
        }
        if (!this._hrefs.some((c, i) => {
            if (c[0] === context) {
                if (i < this._hrefs.length - 1) {
                    this._hrefs.push(this._hrefs.splice(i, 1)[0]);
                }
                return true;
            }
            return false;
        })) {
            let c = this._contexts.get(context);
            if (c == null) {
                this._hrefs = tmpHREFs;
                return false;
            }
            let href = c[1];
            if (href != null) {
                this.insert(href);
                return true;
            }
            return false;
        }
        return true;
    }
    addContextPath(context_name, path, fallback = false) {
        let pathRegexp = generate(path);
        let context = this._contexts.get(context_name);
        if (context == null) {
            this._contexts.set(context_name, context = [[], null]);
        }
        context[0].push({
            path: pathRegexp,
            fallback
        });
        return pathRegexp;
    }
    setContextDefaultHref(context_name, href) {
        let context = this._contexts.get(context_name);
        if (context == null) {
            this._contexts.set(context_name, context = [[], null]);
        }
        context[1] = href !== null ? prepare(href) : null;
    }
    setContext(context) {
        context.paths.forEach(path => {
            this.addContextPath(context.name, path.path, path.fallback);
        });
        if (context.default !== undefined) {
            this.setContextDefaultHref(context.name, context.default);
        }
    }
    hrefs() {
        let hrefs = [];
        this._hrefs.forEach(([c, c_hrefs]) => {
            hrefs.push.apply(hrefs, c_hrefs);
        });
        return hrefs;
    }
}

var ContextManager$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ContextManager: ContextManager
});

var queryString = {};

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

var filterObj = function (obj, predicate) {
	var ret = {};
	var keys = Object.keys(obj);
	var isArr = Array.isArray(predicate);

	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var val = obj[key];

		if (isArr ? predicate.indexOf(key) !== -1 : predicate(key, val, obj)) {
			ret[key] = val;
		}
	}

	return ret;
};

(function (exports) {
const strictUriEncode$1 = strictUriEncode;
const decodeComponent = decodeUriComponent;
const splitOnFirst$1 = splitOnFirst;
const filterObject = filterObj;

const isNullOrUndefined = value => value === null || value === undefined;

const encodeFragmentIdentifier = Symbol('encodeFragmentIdentifier');

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
		case 'bracket-separator': {
			const keyValueSep = options.arrayFormat === 'bracket-separator' ?
				'[]=' :
				'=';

			return key => (result, value) => {
				if (
					value === undefined ||
					(options.skipNull && value === null) ||
					(options.skipEmptyString && value === '')
				) {
					return result;
				}

				// Translate null to an empty string so that it doesn't serialize as 'null'
				value = value === null ? '' : value;

				if (result.length === 0) {
					return [[encode(key, options), keyValueSep, encode(value, options)].join('')];
				}

				return [[result, encode(value, options)].join(options.arrayFormatSeparator)];
			};
		}

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
				const isArray = typeof value === 'string' && value.includes(options.arrayFormatSeparator);
				const isEncodedArray = (typeof value === 'string' && !isArray && decode(value, options).includes(options.arrayFormatSeparator));
				value = isEncodedArray ? decode(value, options) : value;
				const newValue = isArray || isEncodedArray ? value.split(options.arrayFormatSeparator).map(item => decode(item, options)) : value === null ? value : decode(value, options);
				accumulator[key] = newValue;
			};

		case 'bracket-separator':
			return (key, value, accumulator) => {
				const isArray = /(\[\])$/.test(key);
				key = key.replace(/\[\]$/, '');

				if (!isArray) {
					accumulator[key] = value ? decode(value, options) : value;
					return;
				}

				const arrayValue = value === null ?
					[] :
					value.split(options.arrayFormatSeparator).map(item => decode(item, options));

				if (accumulator[key] === undefined) {
					accumulator[key] = arrayValue;
					return;
				}

				accumulator[key] = [].concat(accumulator[key], arrayValue);
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
		return options.strict ? strictUriEncode$1(value) : encodeURIComponent(value);
	}

	return value;
}

function decode(value, options) {
	if (options.decode) {
		return decodeComponent(value);
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

function parse(query, options) {
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

	if (typeof query !== 'string') {
		return ret;
	}

	query = query.trim().replace(/^[?#&]/, '');

	if (!query) {
		return ret;
	}

	for (const param of query.split('&')) {
		if (param === '') {
			continue;
		}

		let [key, value] = splitOnFirst$1(options.decode ? param.replace(/\+/g, ' ') : param, '=');

		// Missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		value = value === undefined ? null : ['comma', 'separator', 'bracket-separator'].includes(options.arrayFormat) ? value : decode(value, options);
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
			if (value.length === 0 && options.arrayFormat === 'bracket-separator') {
				return encode(key, options) + '[]';
			}

			return value
				.reduce(formatter(key), [])
				.join('&');
		}

		return encode(key, options) + '=' + encode(value, options);
	}).filter(x => x.length > 0).join('&');
};

exports.parseUrl = (url, options) => {
	options = Object.assign({
		decode: true
	}, options);

	const [url_, hash] = splitOnFirst$1(url, '#');

	return Object.assign(
		{
			url: url_.split('?')[0] || '',
			query: parse(extract(url), options)
		},
		options && options.parseFragmentIdentifier && hash ? {fragmentIdentifier: decode(hash, options)} : {}
	);
};

exports.stringifyUrl = (object, options) => {
	options = Object.assign({
		encode: true,
		strict: true,
		[encodeFragmentIdentifier]: true
	}, options);

	const url = removeHash(object.url).split('?')[0] || '';
	const queryFromUrl = exports.extract(object.url);
	const parsedQueryFromUrl = exports.parse(queryFromUrl, {sort: false});

	const query = Object.assign(parsedQueryFromUrl, object.query);
	let queryString = exports.stringify(query, options);
	if (queryString) {
		queryString = `?${queryString}`;
	}

	let hash = getHash(object.url);
	if (object.fragmentIdentifier) {
		hash = `#${options[encodeFragmentIdentifier] ? encode(object.fragmentIdentifier, options) : object.fragmentIdentifier}`;
	}

	return `${url}${queryString}${hash}`;
};

exports.pick = (input, filter, options) => {
	options = Object.assign({
		parseFragmentIdentifier: true,
		[encodeFragmentIdentifier]: false
	}, options);

	const {url, query, fragmentIdentifier} = exports.parseUrl(input, options);
	return exports.stringifyUrl({
		url,
		query: filterObject(query, filter),
		fragmentIdentifier
	}, options);
};

exports.exclude = (input, filter, options) => {
	const exclusionFilter = Array.isArray(filter) ? key => !filter.includes(key) : (key, value) => !filter(key, value);

	return exports.pick(input, exclusionFilter, options);
};
}(queryString));

/**
 * @author Giuliano Collacchioni @2020
 */
const DIVIDER = "#R!:";
// add a listener to popstate event to stop propagation on option handling
let catchPopState$2 = null;
let destroyEventListener$3 = null;
function initEventListener$3() {
    if (destroyEventListener$3 !== null) {
        return destroyEventListener$3;
    }
    const listener = (event) => {
        if (catchPopState$2 == null) {
            return;
        }
        event.stopImmediatePropagation();
        event.stopPropagation();
        catchPopState$2();
    };
    window.addEventListener("popstate", listener, true);
    // remove options of just loaded page
    if (Object.keys(get$1()).length > 0) {
        set({});
    }
    return destroyEventListener$3 = () => {
        window.removeEventListener("popstate", listener, true);
        destroyEventListener$3 = null;
    };
}
function onCatchPopState$2(onCatchPopState, once = false) {
    if (once) {
        let tmpOnCatchPopState = onCatchPopState;
        onCatchPopState = () => {
            catchPopState$2 = null;
            tmpOnCatchPopState();
        };
    }
    catchPopState$2 = onCatchPopState;
}
function goTo$1(href, replace = false) {
    return new Promise(resolve => {
        if (href === window.location.href) {
            return resolve();
        }
        onCatchPopState$2(resolve, true);
        if (href[0] === "#") {
            if (replace) {
                window.location.replace(href);
            }
            else {
                window.location.assign(href);
            }
        }
        else {
            if (replace) {
                window.history.replaceState({}, "", href);
            }
            else {
                window.history.pushState({}, "", href);
            }
            window.dispatchEvent(new Event("popstate"));
        }
    });
}
function splitHref(href = window.location.href) {
    let splitted = href.split(DIVIDER);
    if (splitted.length > 2) {
        return [
            splitted.slice(0, splitted.length - 1).join(DIVIDER),
            splitted[splitted.length - 1]
        ];
    }
    return [splitted[0], splitted[1] || ""];
}
/**
 * Converts opts to a query-like string
 * @param opts
 */
function optsToStr(opts) {
    let filteredOpts = {};
    Object.entries(opts).forEach(([key, value]) => {
        if (value !== undefined) {
            filteredOpts[key] = value;
        }
    });
    return queryString.stringify(filteredOpts);
}
/**
 * Gets the options stored in the url
 */
function get$1() {
    return queryString.parse(splitHref()[1]);
}
/**
 * Sets the options
 * @param opts
 */
function set(opts) {
    let newHref = splitHref()[0] + DIVIDER + optsToStr(opts);
    return goTo$1(newHref, true);
}
/**
 * Add an option to those stored in the url
 */
function add(opt, value) {
    let opts = get$1();
    if (opts[opt] === undefined || opts[opt] !== value) {
        opts[opt] = value || null;
        return set(opts);
    }
    return new Promise(resolve => { resolve(); });
}
/**
 * Remove given option
 * @param opt
 */
function remove(opt) {
    let opts = get$1();
    if (opts[opt] !== undefined) {
        delete opts[opt];
        return set(opts);
    }
    return new Promise(resolve => { resolve(); });
}
/**
 * Go to the given href adding the specified options
 * @param href
 * @param opts
 * @param replace
 */
function goWith(href, opts, replace = false) {
    let newHref = splitHref(href)[0] + DIVIDER + optsToStr(opts);
    return goTo$1(newHref, replace);
}
/**
 * Get the href with the options portion
 */
function clearHref() {
    return splitHref()[0];
}

var OptionsManager = /*#__PURE__*/Object.freeze({
    __proto__: null,
    initEventListener: initEventListener$3,
    get: get$1,
    set: set,
    add: add,
    remove: remove,
    goWith: goWith,
    clearHref: clearHref
});

/**
 * @author Giuliano Collacchioni @2020
 */
let BASE = "#";
let LOCATION_BASE = null;
let LOCATION_PATHNAME = null;
function getLocationBase() {
    if (LOCATION_BASE !== null) {
        return LOCATION_BASE;
    }
    return LOCATION_BASE = `${window.location.protocol}//${window.location.host}`;
}
function getLocationPathname() {
    if (LOCATION_PATHNAME !== null) {
        return LOCATION_PATHNAME;
    }
    return LOCATION_PATHNAME = window.location.pathname;
}
function getLocation$1() {
    return getLocationBase() + (BASE[0] === "#" ? getLocationPathname() : "");
}
const parenthesesRegex = /[\\\/]+/g;
function base(value) {
    if (value != null) {
        if (typeof value !== "string") {
            throw new TypeError("invalid base value");
        }
        value += "/";
        value = value.replace(parenthesesRegex, "/");
        if (value[0] !== "#" && value[0] !== "/") {
            value = "/" + value;
        }
        if (value[0] === "/" && !window.history.pushState) {
            value = "#" + value;
        }
        BASE = value;
    }
    return BASE;
}
function get() {
    const LOCATION = getLocation$1();
    return `/${prepare(clearHref().split(LOCATION).slice(1).join(LOCATION).split(BASE).slice(1).join(BASE))}`.replace(parenthesesRegex, "/");
}
function construct(href, full = false) {
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
    return (full ? getLocation$1() : "") +
        (BASE + "/" + href).replace(parenthesesRegex, "/");
}

var URLManager = /*#__PURE__*/Object.freeze({
    __proto__: null,
    base: base,
    get: get,
    construct: construct
});

/**
 * @author Giuliano Collacchioni @2020
 */
let started = false;
let historyManaged = null;
function setAutoManagement(value) {
    if (started) {
        throw new Error("HistoryManager already started");
    }
    historyManaged = !!value;
}
function getAutoManagement() {
    return historyManaged || false;
}
let works = [];
let onworkfinished = [];
function onWorkFinished(callback, context) {
    if (works.length === 0) {
        callback.call(context || null);
        return;
    }
    onworkfinished.push([callback, context || null]);
}
function createWork(locking = false) {
    let finished = false;
    let finishing = false;
    let work = {
        get locking() {
            return locking;
        },
        get finished() {
            return finished;
        },
        get finishing() {
            return finishing;
        },
        finish() {
            if (finished) {
                return;
            }
            finished = true;
            finishing = false;
            let i = works.length - 1;
            for (; i >= 0; i--) {
                if (works[i] === work) {
                    works.splice(i, 1);
                    break;
                }
            }
            if (i >= 0 && works.length === 0) {
                while (onworkfinished.length > 0 && works.length === 0) {
                    let [callback, context] = onworkfinished.shift();
                    callback.call(context || window);
                }
            }
        },
        beginFinish() {
            finishing = true;
        },
        askFinish() {
            return false;
        }
    };
    works.push(work);
    return work;
}
function acquire() {
    let lock = createWork(true);
    return lock;
}
function isLocked$1() {
    return works.some(w => w.locking);
}
let catchPopState$1 = null;
let destroyEventListener$2 = null;
function initEventListener$2() {
    if (destroyEventListener$2 !== null) {
        return destroyEventListener$2;
    }
    const destroyOptionsEventListener = initEventListener$3();
    const listener = (event) => {
        if (!started || isLocked$1()) {
            return;
        }
        if (catchPopState$1 == null) {
            handlePopState$1();
            return;
        }
        event.stopImmediatePropagation();
        catchPopState$1();
    };
    window.addEventListener("popstate", listener, true);
    return destroyEventListener$2 = () => {
        window.removeEventListener("popstate", listener, true);
        destroyOptionsEventListener();
        destroyEventListener$2 = null;
    };
}
function onCatchPopState$1(onCatchPopState, once = false) {
    if (once) {
        let tmpOnCatchPopState = onCatchPopState;
        onCatchPopState = () => {
            catchPopState$1 = null;
            tmpOnCatchPopState();
        };
    }
    catchPopState$1 = onCatchPopState;
}
function goTo(href, replace = false) {
    const fullHref = construct(href, true);
    href = construct(href);
    if (window.location.href === fullHref) {
        window.dispatchEvent(new Event("popstate"));
        return;
    }
    if (href[0] === "#") {
        if (replace) {
            window.location.replace(href);
        }
        else {
            window.location.assign(href);
        }
    }
    else {
        if (replace) {
            window.history.replaceState({}, "", href);
        }
        else {
            window.history.pushState({}, "", href);
        }
        window.dispatchEvent(new Event("popstate"));
    }
}
function addFront(frontHref = "next") {
    let href = get();
    let work = createWork();
    return new Promise(resolve => {
        goWith(construct(frontHref, true), { back: undefined, front: null })
            .then(() => new Promise(resolve => {
            onCatchPopState$1(resolve, true);
            window.history.go(-1);
        }))
            .then(() => new Promise(resolve => {
            onCatchPopState$1(resolve, true);
            goTo(href, true);
        }))
            .then(() => {
            work.finish();
            resolve();
        });
    });
}
function addBack(backHref = "") {
    let href = get();
    let work = createWork();
    return new Promise(resolve => {
        (new Promise(resolve => {
            onCatchPopState$1(resolve, true);
            window.history.go(-1);
        }))
            .then(() => new Promise(resolve => {
            if (backHref) {
                onCatchPopState$1(resolve, true);
                goTo(backHref, true);
            }
            else {
                resolve();
            }
        }))
            .then(() => set({ back: null, front: undefined }))
            .then(() => new Promise(resolve => {
            onCatchPopState$1(resolve, true);
            goTo(href);
        }))
            .then(() => {
            work.finish();
            resolve();
        });
    });
}
let hasBack = false;
let contextManager = new ContextManager();
function index$1() {
    return contextManager.index();
}
function getHREFAt(index) {
    return contextManager.get(index);
}
function setContext$1(context) {
    if (historyManaged === null) {
        historyManaged = true;
    }
    return contextManager.setContext(context);
}
function addContextPath$1(context, href, isFallback = false) {
    if (historyManaged === null) {
        historyManaged = true;
    }
    return contextManager.addContextPath(context, href, isFallback);
}
function setContextDefaultHref$1(context, href) {
    if (historyManaged === null) {
        historyManaged = true;
    }
    return contextManager.setContextDefaultHref(context, href);
}
function getContextDefaultOf$1(context) {
    return contextManager.getDefaultOf(context);
}
function getContext$1(href = null) {
    if (href == null) {
        return contextManager.currentContext();
    }
    return contextManager.contextOf(href);
}
function getHREFs() {
    if (!historyManaged) {
        throw new Error("can't keep track of hrefs without history management");
    }
    return contextManager.hrefs();
}
function tryUnlock() {
    let locksAsked = 0;
    for (let i = works.length - 1; i >= 0; i--) {
        let work = works[i];
        if (work.locking && !work.finishing) {
            if (!work.askFinish()) {
                return -1;
            }
            locksAsked++;
        }
    }
    return locksAsked;
}
let workToRelease = null;
function restore(context) {
    if (!historyManaged) {
        throw new Error("can't restore a context without history management");
    }
    let locksFinished = tryUnlock();
    if (locksFinished === -1) {
        return new Promise((_, reject) => { reject(); });
    }
    let promiseResolve;
    let promise = new Promise(resolve => { promiseResolve = resolve; });
    onWorkFinished(() => {
        let previousIndex = contextManager.index();
        if (contextManager.restore(context)) {
            let replace = previousIndex >= contextManager.index();
            workToRelease = createWork();
            onWorkFinished(promiseResolve);
            let href = contextManager.get();
            let hadBack = hasBack;
            (new Promise(resolve => {
                if (!replace && !hasBack) {
                    onCatchPopState$1(resolve, true);
                    goTo(href);
                }
                else {
                    resolve();
                }
            }))
                .then(() => new Promise(resolve => {
                let index = contextManager.index() - 1;
                if (replace && !hasBack) {
                    resolve();
                }
                else {
                    addBack(contextManager.get(index))
                        .then(() => {
                        hasBack = true;
                        resolve();
                    });
                }
            }))
                .then(() => new Promise(resolve => {
                if (hadBack || replace) {
                    onCatchPopState$1(resolve, true);
                    goTo(href, true);
                }
                else {
                    resolve();
                }
            }))
                .then(onlanded);
        }
        else {
            promiseResolve();
        }
    });
    return promise;
}
function assign(href) {
    let locksFinished = tryUnlock();
    if (locksFinished === -1) {
        return new Promise((_, reject) => { reject(); });
    }
    let promiseResolve;
    let promise = new Promise(resolve => { promiseResolve = resolve; });
    onWorkFinished(() => {
        workToRelease = createWork();
        onWorkFinished(promiseResolve);
        goTo(href);
    });
    return promise;
}
let replacing = false;
function replace(href) {
    let locksFinished = tryUnlock();
    if (locksFinished === -1) {
        return new Promise((_, reject) => { reject(); });
    }
    let promiseResolve;
    let promise = new Promise(resolve => { promiseResolve = resolve; });
    onWorkFinished(() => {
        workToRelease = createWork();
        onWorkFinished(promiseResolve);
        goTo(href, replacing = true);
    });
    return promise;
}
function go$1(direction) {
    let locksFinished = tryUnlock();
    if (locksFinished === -1) {
        return new Promise((resolve, reject) => {
            reject();
        });
    }
    if (direction === 0) {
        return Promise.resolve();
    }
    direction = parseInt(direction, 10) + locksFinished;
    if (isNaN(direction)) {
        throw new Error("direction must be a number");
    }
    if (direction === 0) {
        return Promise.resolve();
    }
    let promiseResolve;
    let promise = new Promise((resolve, reject) => { promiseResolve = resolve; });
    onWorkFinished(() => {
        if (historyManaged === false) {
            window.history.go(direction);
            promiseResolve();
            return;
        }
        const contextIndex = contextManager.index();
        let index = Math.max(0, Math.min(contextManager.length() - 1, contextIndex + direction));
        if (contextIndex === index) {
            onlanded();
            promiseResolve();
            return;
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
function start$1(fallbackContext) {
    if (historyManaged === null) {
        historyManaged = false;
    }
    fallbackContext = historyManaged ?
        (fallbackContext === void 0 ? contextManager.getContextNames()[0] : fallbackContext)
        : null;
    let href = get();
    let promiseResolve;
    let promiseReject;
    const promise = new Promise((resolve, reject) => {
        promiseResolve = resolve;
        promiseReject = reject;
    });
    if (historyManaged) {
        let context = contextManager.contextOf(href, false);
        if (context == null) {
            if (!fallbackContext) {
                throw new Error("must define a fallback context");
            }
            let defaultHREF = contextManager.getDefaultOf(fallbackContext);
            if (defaultHREF == null) {
                throw new Error("must define a default href for the fallback context");
            }
            started = true;
            href = defaultHREF;
            workToRelease = createWork();
            onCatchPopState$1(() => { onlanded(); promiseResolve(); }, true);
            goTo(defaultHREF, true);
        }
        contextManager.insert(href);
        if (context == null) {
            promiseReject();
            return promise;
        }
    }
    started = true;
    onlanded();
    promiseResolve();
    return promise;
}
function isStarted() {
    return started;
}
function onlanded() {
    window.dispatchEvent(new Event("historylanded"));
    if (workToRelease != null) {
        let work = workToRelease;
        workToRelease = null;
        work.finish();
    }
}
function handlePopState$1() {
    let options = {
        ...get$1(),
        ...(historyManaged ? {} : { front: undefined, back: undefined })
    };
    if (options.locked) {
        onCatchPopState$1(() => {
            if (get$1().locked) {
                handlePopState$1();
            }
        }, true);
        window.history.go(-1);
        return;
    }
    if (options.front !== undefined) {
        let frontEvent = new Event("historyforward", { cancelable: true });
        window.dispatchEvent(frontEvent);
        if (frontEvent.defaultPrevented) {
            onCatchPopState$1(() => { return; }, true);
            window.history.go(-1);
            return;
        }
        // should go forward in history
        let backHref = contextManager.get();
        let href = contextManager.goForward();
        (new Promise(resolve => {
            if (hasBack) {
                onCatchPopState$1(resolve, true);
                window.history.go(-1);
            }
            else {
                resolve();
            }
        }))
            .then(() => new Promise(resolve => {
            onCatchPopState$1(resolve, true);
            goTo(href, true);
        }))
            .then(addBack.bind(null, backHref))
            .then(() => new Promise(resolve => {
            if (contextManager.index() < contextManager.length() - 1) {
                onCatchPopState$1(resolve, true);
                addFront(contextManager.get(contextManager.index() + 1)).then(resolve);
            }
            else {
                resolve();
            }
        }))
            .then(() => {
            hasBack = true;
            onlanded();
        });
    }
    else if (options.back !== undefined) {
        let backEvent = new Event("historybackward", { cancelable: true });
        window.dispatchEvent(backEvent);
        if (backEvent.defaultPrevented) {
            onCatchPopState$1(() => { return; }, true);
            window.history.go(+1);
            return;
        }
        // should go backward in history
        let frontHref = contextManager.get();
        let href = contextManager.goBackward();
        (new Promise(resolve => {
            if (contextManager.index() > 0) {
                onCatchPopState$1(resolve, true);
                window.history.go(1);
            }
            else {
                resolve();
            }
        }))
            .then(() => new Promise(resolve => {
            onCatchPopState$1(resolve, true);
            goTo(href, true);
        }))
            .then(addFront.bind(null, frontHref))
            .then(() => {
            hasBack = contextManager.index() > 0;
            onlanded();
        });
    }
    else {
        // should add new page to history
        let href = get();
        let backHref = contextManager.get();
        if (href === backHref || !historyManaged) {
            return onlanded();
        }
        let replaced = replacing;
        replacing = false;
        let willHaveBack = hasBack || !replaced;
        contextManager.insert(href, replaced);
        (new Promise(resolve => {
            if (hasBack && !replaced) {
                onCatchPopState$1(resolve, true);
                window.history.go(-1);
            }
            else {
                resolve();
            }
        }))
            .then(() => {
            if (replaced) {
                return Promise.resolve();
            }
            return addBack(backHref);
        })
            .then(() => new Promise(resolve => {
            onCatchPopState$1(resolve, true);
            goTo(href, true);
        }))
            .then(() => {
            hasBack = willHaveBack;
            onlanded();
        });
    }
}

var HistoryManager = /*#__PURE__*/Object.freeze({
    __proto__: null,
    setAutoManagement: setAutoManagement,
    getAutoManagement: getAutoManagement,
    onWorkFinished: onWorkFinished,
    acquire: acquire,
    initEventListener: initEventListener$2,
    addFront: addFront,
    addBack: addBack,
    index: index$1,
    getHREFAt: getHREFAt,
    setContext: setContext$1,
    addContextPath: addContextPath$1,
    setContextDefaultHref: setContextDefaultHref$1,
    getContextDefaultOf: getContextDefaultOf$1,
    getContext: getContext$1,
    getHREFs: getHREFs,
    restore: restore,
    assign: assign,
    replace: replace,
    go: go$1,
    start: start$1,
    isStarted: isStarted
});

/**
 * @author Giuliano Collacchioni @2020
 */
let locks$1 = [];
let catchPopState = null;
let destroyEventListener$1 = null;
function initEventListener$1() {
    if (destroyEventListener$1 !== null) {
        return destroyEventListener$1;
    }
    const listener = (event) => {
        if (catchPopState == null) {
            return handlePopState();
        }
        event.stopImmediatePropagation();
        catchPopState();
    };
    window.addEventListener("popstate", listener, true);
    return destroyEventListener$1 = () => {
        window.removeEventListener("popstate", listener, true);
        destroyEventListener$1 = null;
    };
}
function onCatchPopState(onCatchPopState, once = false) {
    if (once) {
        let tmpOnCatchPopState = onCatchPopState;
        onCatchPopState = () => {
            catchPopState = null;
            tmpOnCatchPopState();
        };
    }
    catchPopState = onCatchPopState;
}
function lock$2() {
    const delegate = new EventTarget();
    const id = Date.now();
    let historyLock;
    let promiseResolve;
    let isPromiseResolved = false;
    const promise = new Promise(resolve => {
        promiseResolve = lock => {
            resolve(lock);
            isPromiseResolved = true;
        };
    });
    onWorkFinished(() => {
        historyLock = acquire();
        const lock = {
            lock: {
                get id() {
                    return id;
                },
                listen(listener) {
                    delegate.addEventListener("navigation", listener);
                },
                unlisten(listener) {
                    delegate.removeEventListener("navigation", listener);
                },
                unlock() {
                    if (!locks$1.length || historyLock.finishing) {
                        return;
                    }
                    const fn = () => {
                        if (locks$1[locks$1.length - 1].lock.id === id) {
                            unlock$1();
                        }
                        else {
                            locks$1.some((lock, index) => {
                                if (lock.lock.id === id) {
                                    locks$1.splice(index, 1)[0].release();
                                }
                                return false;
                            });
                        }
                    };
                    if (isPromiseResolved) {
                        fn();
                    }
                    else {
                        promise.then(fn);
                    }
                }
            },
            fire() {
                let e = new Event("navigation", { cancelable: true });
                delegate.dispatchEvent(e);
                return e.defaultPrevented;
            },
            release() {
                historyLock.finish();
            },
            beginRelease(start_fn) {
                historyLock.beginFinish();
                if (isPromiseResolved) {
                    start_fn();
                }
                else {
                    promise.then(() => start_fn());
                }
            }
        };
        historyLock.askFinish = () => {
            if (!lock.fire()) {
                return false;
            }
            lock.lock.unlock();
            return true;
        };
        locks$1.push(lock);
        goWith(clearHref(), { ...get$1(), locked: lock.lock.id }).then(() => {
            promiseResolve(lock.lock);
        });
    });
    return promise;
}
function unlock$1(force = true) {
    let wrapper = locks$1.splice(locks$1.length - 1, 1)[0];
    if (wrapper == null) {
        return true;
    }
    if (!force && !wrapper.fire()) {
        return false;
    }
    wrapper.beginRelease(() => {
        onCatchPopState(() => {
            wrapper.release();
        }, true);
        window.history.go(-1);
    });
    return true;
}
function locked$1() {
    return locks$1.length > 0;
}
let shouldUnlock = false;
function handlePopState() {
    if (locks$1.length === 0) {
        return;
    }
    let lockId = parseInt(get$1().locked, 10);
    if (isNaN(lockId)) {
        shouldUnlock = true;
        window.history.go(1);
    }
    else {
        let lock = locks$1[locks$1.length - 1];
        if (lockId === lock.lock.id) {
            if (shouldUnlock && lock.fire()) {
                unlock$1();
            }
            shouldUnlock = false;
            return;
        }
        else if (lockId > lock.lock.id) {
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
    initEventListener: initEventListener$1,
    lock: lock$2,
    unlock: unlock$1,
    locked: locked$1
});

/**
 * @author Giuliano Collacchioni @2020
 */
const ROUTES = Symbol("routes");
const REDIRECTIONS = Symbol("redirections");
const DESTROYED = Symbol("destroyed");
/**
 * Genera una Map avendo le chiavi e i valori associati in due liste separate
 * @param keys
 * @param values
 */
function KeyMapFrom(keys, values) {
    let map = new Map();
    keys.forEach((key, index) => {
        map.set(key.name.toString(), values[index]);
    });
    return map;
}
let routers = [];
function getLocation(href = get()) {
    let pathname = "";
    let hash = "";
    let query = "";
    let cachedQuery = null;
    // href = "/" + href.replace(/[\\\/]+(?![^(]*[)])/g, "/").replace(/^[\/]+/, "").replace(/[\/]+$/, "");
    {
        let split = href.split("#");
        pathname = split.shift();
        hash = split.join("#");
        hash = hash ? "#" + hash : "";
    }
    {
        let split = pathname.split("?");
        pathname = split.shift();
        query = split.join("?");
        query = query ? "?" + query : "";
    }
    pathname = prepare(pathname);
    return {
        hrefIf: function (go) {
            let oldP = pathname;
            let oldH = hash;
            let oldQ = query;
            this.href = go;
            let hrefIf = this.href;
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
                // refresh
                return;
            }
            // match at start "//", "/", "#" or "?"
            let match = value.match(/^([\/\\]{2,})|([\/\\]{1})|([#])|([\?])/);
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
                        // here only for "//", not valid
                        return;
                    }
                }
            }
            else {
                let path = pathname.split("/");
                // replace last item with the new value
                path.pop();
                path.push(prepare(value));
                pathname = path.join("/");
                hash = "";
                query = "";
            }
            // emit?
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
        hasQueryParam(param) {
            if (!query) {
                return false;
            }
            return this.parsedQuery[param] !== undefined;
        },
        getQueryParam(param) {
            if (!query) {
                return undefined;
            }
            return this.parsedQuery[param];
        },
        addQueryParam(param, value = null) {
            let newQuery = { ...this.parsedQuery, [param]: value };
            cachedQuery = null;
            query = queryString.stringify(newQuery);
            if (query) {
                query = "?" + query;
            }
        },
        removeQueryParam(param) {
            if (!query) {
                return;
            }
            let parsedQuery = this.parsedQuery;
            delete parsedQuery[param];
            this.query = queryString.stringify(parsedQuery);
        }
    };
}
function emitSingle(router, location) {
    // se non è disponibile `location` recuperare l'attuale
    let path;
    if (location) {
        path = location.pathname;
    }
    else {
        location = getLocation();
        path = location.pathname;
    }
    // path = PathGenerator.prepare(path); // it is done inside location, is it needed here?
    let redirection = null;
    // check if this route should be redirected
    router[REDIRECTIONS].some(redirectionRoute => {
        let exec = redirectionRoute.regex.exec(path);
        if (exec) {
            redirection = { location: location, keymap: KeyMapFrom(redirectionRoute.keys, exec.slice(1)) };
            location = getLocation(redirectionRoute.redirection);
            path = location.pathname;
            return false;
        }
        return false;
    });
    router[ROUTES].some(route => {
        let exec = route.regex.exec(path);
        if (exec) {
            route.callback(location, KeyMapFrom(route.keys, exec.slice(1)), redirection);
            return true;
        }
        return false;
    });
}
function _emit() {
    let location = getLocation();
    routers.forEach(router => {
        emitSingle(router, location);
    });
}
let emitRoute = true;
function onland() {
    if (emitRoute) {
        _emit();
    }
    else {
        emitRoute = true;
    }
}
let destroyEventListener = null;
function initEventListener() {
    if (destroyEventListener !== null) {
        return destroyEventListener;
    }
    const destroyHistoryEventListener = initEventListener$2();
    const destroyNavigationLockEventListener = initEventListener$1();
    window.addEventListener("historylanded", onland);
    return destroyEventListener = () => {
        window.removeEventListener("historylanded", onland);
        destroyNavigationLockEventListener();
        destroyHistoryEventListener();
        destroyEventListener = null;
    };
}
function _go(path, replace$1 = false, emit = true) {
    let lastEmitRoute = emitRoute;
    emitRoute = emit;
    return (replace$1 ? replace(path) : assign(path)).catch(() => {
        emitRoute = lastEmitRoute;
    });
}
function _throwIfDestroyed(router) {
    if (router[DESTROYED]) {
        throw new Error("Router destroyed");
    }
}
class GenericRouter {
    constructor() {
        routers.push(this);
    }
    [ROUTES] = [];
    [REDIRECTIONS] = [];
    [DESTROYED] = false;
    destroy() {
        if (this[DESTROYED]) {
            return;
        }
        let index = routers.indexOf(this);
        if (index > -1) {
            routers.splice(index, 1);
        }
        this[DESTROYED] = true;
    }
    /**
     * Segna il percorso specificato come reindirizzamento ad un altro
     * @param path
     * @param redirection
     */
    redirect(path, redirection) {
        _throwIfDestroyed(this);
        let keys = [];
        let regex = generate(path, keys);
        this[REDIRECTIONS].push({ regex, keys, redirection: prepare(redirection) });
        return regex;
    }
    /**
     * Elimina un reindirizzamento
     * @param path
     */
    unredirect(path) {
        _throwIfDestroyed(this);
        let keys = [];
        let regex = generate(path, keys);
        let rIndex = -1;
        this[ROUTES].some((route, index) => {
            let xSource = (regex.ignoreCase ? regex.source.toLowerCase() : regex.source);
            let ySource = (route.regex.ignoreCase ? route.regex.source.toLowerCase() : route.regex.source);
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
    }
    /**
     * Associa una funzione ad un percorso
     * @param path
     * @param callback
     */
    route(path, callback) {
        _throwIfDestroyed(this);
        let keys = [];
        let regex = generate(path, keys);
        this[ROUTES].push({ regex, keys, callback });
        return regex;
    }
    /**
     * Elimina la funzione associata al percorso
     * @param path
     */
    unroute(path) {
        _throwIfDestroyed(this);
        let keys = [];
        let regex = generate(path, keys);
        let rIndex = -1;
        this[ROUTES].some((route, index) => {
            let xSource = (regex.ignoreCase ? regex.source.toLowerCase() : regex.source);
            let ySource = (route.regex.ignoreCase ? route.regex.source.toLowerCase() : route.regex.source);
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
    }
    emit() {
        emitSingle(this);
    }
}
// interface IMainRouter extends GenericRouter {
//     /**
//      * Crea un router separato dal principale
//      */
//     create(): GenericRouter;
//     setQueryParam(param: string, value: string | null | undefined, options?: { replace?: boolean, emit?: boolean }): Promise<undefined>;
//     go(path: string, options?: { replace?: boolean, emit?: boolean }): Promise<undefined>;
//     go(index: number, options?: { emit: boolean }): Promise<undefined>;
//     base: string;
//     location: ILocation;
//     /**
//      * Blocca la navigazione
//      */
//     lock(/* ghost?: boolean */): Promise<NavigationLock.Lock>;
//     /**
//      * Sblocca la navigazione
//      */
//     unlock(force?: boolean): boolean;
//     locked: boolean;
//     getContext(href?: string): string | null;
//     /**
//      * Associa un percorso ad un contesto
//      * @param context
//      * @param href
//      * @param isFallbackContext
//      * @param canChain
//      */
//     addContextPath(context: string, href: string, isFallbackContext?: boolean, canChain?: boolean): RegExp;
//     /**
//      * Imposta il percorso predefinito di un contesto
//      * @param context
//      * @param href
//      */
//     setContextDefaultHref(context: string, href: string): void;
//     /**
//      * Imposta un contesto
//      * @param this
//      * @param context
//      */
//     setContext(context: {
//         name: string,
//         paths: { path: string, fallback?: boolean }[],
//         default?: string
//     }): void;
//     restoreContext(context: string, defaultHref?: string): Promise<void>;
//     emit(single?: boolean): void;
//     // start(startingContext: string, organizeHistory?: boolean): boolean;
//     start(startingContext: string): void;
//     getLocationAt(index: number): ILocation | null;
//     index(): number;
// }
let main = new GenericRouter();
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
// :TODO:
// main.start = function (startingContext: string, organizeHistory: boolean = true): boolean {
function start(startingContext) {
    initEventListener();
    return start$1(startingContext);
}
function index() {
    return index$1();
}
function getLocationAt(index) {
    let href = getHREFAt(index);
    if (href == null) {
        return null;
    }
    return getLocation(href);
}
function addContextPath(context, href, isFallback = false) {
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
function emit(single = false) {
    if (single) {
        return emitSingle(main);
    }
    return _emit();
}
function create() {
    return new GenericRouter();
}
function go(path_index, options) {
    // tslint:disable-next-line: typedef
    let path_index_type = typeof path_index;
    if (path_index_type !== "string" && path_index_type !== "number") {
        throw new Error("router.go should receive an url string or a number");
    }
    // let promiseResolve: () => void;
    const normalizedOptions = { emit: true, replace: false, ...options };
    return new Promise((promiseResolve, promiseReject) => {
        let goingEvent = new CustomEvent("router:going", {
            detail: {
                direction: path_index,
                ...normalizedOptions
            },
            cancelable: true
        });
        window.dispatchEvent(goingEvent);
        if (goingEvent.defaultPrevented) {
            promiseReject();
            return;
        }
        if (path_index_type === "string") {
            _go(path_index, (normalizedOptions && normalizedOptions.replace) || false, (normalizedOptions == null || normalizedOptions.emit == null) ? true : normalizedOptions.emit).then(promiseResolve);
        }
        else {
            let lastEmitRoute = emitRoute;
            emitRoute = normalizedOptions.emit == null ? true : normalizedOptions.emit;
            go$1(path_index).then(promiseResolve, () => {
                emitRoute = lastEmitRoute;
            });
        }
    });
}
function setQueryParam(param, value, options) {
    let promiseResolve;
    let promise = new Promise(resolve => { promiseResolve = resolve; });
    onWorkFinished(() => {
        let location = getLocation();
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
function lock$1() {
    return lock$2();
}
function unlock(force = true) {
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
    initEventListener: initEventListener,
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
    lock: lock$1,
    unlock: unlock,
    destroy: destroy,
    getBase: getBase,
    setBase: setBase,
    isLocked: isLocked,
    NavigationLock: NavigationLock
});

let locks = [];
function lock(locking_fn) {
    let released = false;
    let releasing = false;
    let onrelease = [];
    let lock = {
        get released() {
            return released;
        },
        get releasing() {
            return releasing;
        },
        release() {
            if (released) {
                return;
            }
            released = true;
            releasing = false;
            let i = locks.length - 1;
            for (; i >= 0; i--) {
                if (locks[i] === lock) {
                    locks.splice(i, 1);
                    break;
                }
            }
            if (i >= 0) {
                onrelease.forEach(([callback, context]) => {
                    callback.call(context || null);
                });
            }
        },
        beginRelease(start_fn) {
            releasing = true;
            start_fn();
        },
        onrelease(callback, context = null) {
            onrelease.push([callback, context || null]);
        }
    };
    return new Promise(resolve => {
        ondone(() => {
            let result = locking_fn.call(lock, lock);
            locks.push(lock);
            if (result !== false && result !== void 0) {
                lock.release();
            }
            resolve(lock);
        });
    });
}
function locked() {
    return locks.length > 0 && locks.every(lock => !lock.releasing && !lock.released);
}
let currentWork = -1;
let working = 0;
let ondoneCallbacks = [];
function completeWork() {
    if (currentWork === -1) {
        return;
    }
    if (--working === 0) {
        currentWork = -1;
        while (ondoneCallbacks.length && currentWork === -1) {
            let [callback, context] = ondoneCallbacks.shift();
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
function startWork(start_fn, id = Date.now()) {
    if (locked()) {
        console.error("navigation is locked");
        return -1;
    }
    let completed = false;
    ondoneWork(() => {
        currentWork = id;
        working++;
        start_fn(() => {
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
    lock: lock,
    locked: locked,
    startWork: startWork,
    ondone: ondone
});

export { ContextManager$1 as ContextManager, HistoryManager, NavigationLock, OptionsManager, PathGenerator, Router, URLManager, WorkManager };
