(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.historyManager = {}));
})(this, (function (exports) { 'use strict';

    var dist = {};

    var hasRequiredDist;

    function requireDist () {
    	if (hasRequiredDist) return dist;
    	hasRequiredDist = 1;
    	Object.defineProperty(dist, "__esModule", { value: true });
    	dist.TokenData = void 0;
    	dist.parse = parse;
    	dist.compile = compile;
    	dist.match = match;
    	dist.pathToRegexp = pathToRegexp;
    	dist.stringify = stringify;
    	const DEFAULT_DELIMITER = "/";
    	const NOOP_VALUE = (value) => value;
    	const ID_START = /^[$_\p{ID_Start}]$/u;
    	const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u;
    	const DEBUG_URL = "https://git.new/pathToRegexpError";
    	const SIMPLE_TOKENS = {
    	    // Groups.
    	    "{": "{",
    	    "}": "}",
    	    // Reserved.
    	    "(": "(",
    	    ")": ")",
    	    "[": "[",
    	    "]": "]",
    	    "+": "+",
    	    "?": "?",
    	    "!": "!",
    	};
    	/**
    	 * Escape text for stringify to path.
    	 */
    	function escapeText(str) {
    	    return str.replace(/[{}()\[\]+?!:*]/g, "\\$&");
    	}
    	/**
    	 * Escape a regular expression string.
    	 */
    	function escape(str) {
    	    return str.replace(/[.+*?^${}()[\]|/\\]/g, "\\$&");
    	}
    	/**
    	 * Tokenize input string.
    	 */
    	function* lexer(str) {
    	    const chars = [...str];
    	    let i = 0;
    	    function name() {
    	        let value = "";
    	        if (ID_START.test(chars[++i])) {
    	            value += chars[i];
    	            while (ID_CONTINUE.test(chars[++i])) {
    	                value += chars[i];
    	            }
    	        }
    	        else if (chars[i] === '"') {
    	            let pos = i;
    	            while (i < chars.length) {
    	                if (chars[++i] === '"') {
    	                    i++;
    	                    pos = 0;
    	                    break;
    	                }
    	                if (chars[i] === "\\") {
    	                    value += chars[++i];
    	                }
    	                else {
    	                    value += chars[i];
    	                }
    	            }
    	            if (pos) {
    	                throw new TypeError(`Unterminated quote at ${pos}: ${DEBUG_URL}`);
    	            }
    	        }
    	        if (!value) {
    	            throw new TypeError(`Missing parameter name at ${i}: ${DEBUG_URL}`);
    	        }
    	        return value;
    	    }
    	    while (i < chars.length) {
    	        const value = chars[i];
    	        const type = SIMPLE_TOKENS[value];
    	        if (type) {
    	            yield { type, index: i++, value };
    	        }
    	        else if (value === "\\") {
    	            yield { type: "ESCAPED", index: i++, value: chars[i++] };
    	        }
    	        else if (value === ":") {
    	            const value = name();
    	            yield { type: "PARAM", index: i, value };
    	        }
    	        else if (value === "*") {
    	            const value = name();
    	            yield { type: "WILDCARD", index: i, value };
    	        }
    	        else {
    	            yield { type: "CHAR", index: i, value: chars[i++] };
    	        }
    	    }
    	    return { type: "END", index: i, value: "" };
    	}
    	class Iter {
    	    constructor(tokens) {
    	        this.tokens = tokens;
    	    }
    	    peek() {
    	        if (!this._peek) {
    	            const next = this.tokens.next();
    	            this._peek = next.value;
    	        }
    	        return this._peek;
    	    }
    	    tryConsume(type) {
    	        const token = this.peek();
    	        if (token.type !== type)
    	            return;
    	        this._peek = undefined; // Reset after consumed.
    	        return token.value;
    	    }
    	    consume(type) {
    	        const value = this.tryConsume(type);
    	        if (value !== undefined)
    	            return value;
    	        const { type: nextType, index } = this.peek();
    	        throw new TypeError(`Unexpected ${nextType} at ${index}, expected ${type}: ${DEBUG_URL}`);
    	    }
    	    text() {
    	        let result = "";
    	        let value;
    	        while ((value = this.tryConsume("CHAR") || this.tryConsume("ESCAPED"))) {
    	            result += value;
    	        }
    	        return result;
    	    }
    	}
    	/**
    	 * Tokenized path instance.
    	 */
    	class TokenData {
    	    constructor(tokens) {
    	        this.tokens = tokens;
    	    }
    	}
    	dist.TokenData = TokenData;
    	/**
    	 * Parse a string for the raw tokens.
    	 */
    	function parse(str, options = {}) {
    	    const { encodePath = NOOP_VALUE } = options;
    	    const it = new Iter(lexer(str));
    	    function consume(endType) {
    	        const tokens = [];
    	        while (true) {
    	            const path = it.text();
    	            if (path)
    	                tokens.push({ type: "text", value: encodePath(path) });
    	            const param = it.tryConsume("PARAM");
    	            if (param) {
    	                tokens.push({
    	                    type: "param",
    	                    name: param,
    	                });
    	                continue;
    	            }
    	            const wildcard = it.tryConsume("WILDCARD");
    	            if (wildcard) {
    	                tokens.push({
    	                    type: "wildcard",
    	                    name: wildcard,
    	                });
    	                continue;
    	            }
    	            const open = it.tryConsume("{");
    	            if (open) {
    	                tokens.push({
    	                    type: "group",
    	                    tokens: consume("}"),
    	                });
    	                continue;
    	            }
    	            it.consume(endType);
    	            return tokens;
    	        }
    	    }
    	    const tokens = consume("END");
    	    return new TokenData(tokens);
    	}
    	/**
    	 * Compile a string to a template function for the path.
    	 */
    	function compile(path, options = {}) {
    	    const { encode = encodeURIComponent, delimiter = DEFAULT_DELIMITER } = options;
    	    const data = path instanceof TokenData ? path : parse(path, options);
    	    const fn = tokensToFunction(data.tokens, delimiter, encode);
    	    return function path(data = {}) {
    	        const [path, ...missing] = fn(data);
    	        if (missing.length) {
    	            throw new TypeError(`Missing parameters: ${missing.join(", ")}`);
    	        }
    	        return path;
    	    };
    	}
    	function tokensToFunction(tokens, delimiter, encode) {
    	    const encoders = tokens.map((token) => tokenToFunction(token, delimiter, encode));
    	    return (data) => {
    	        const result = [""];
    	        for (const encoder of encoders) {
    	            const [value, ...extras] = encoder(data);
    	            result[0] += value;
    	            result.push(...extras);
    	        }
    	        return result;
    	    };
    	}
    	/**
    	 * Convert a single token into a path building function.
    	 */
    	function tokenToFunction(token, delimiter, encode) {
    	    if (token.type === "text")
    	        return () => [token.value];
    	    if (token.type === "group") {
    	        const fn = tokensToFunction(token.tokens, delimiter, encode);
    	        return (data) => {
    	            const [value, ...missing] = fn(data);
    	            if (!missing.length)
    	                return [value];
    	            return [""];
    	        };
    	    }
    	    const encodeValue = encode || NOOP_VALUE;
    	    if (token.type === "wildcard" && encode !== false) {
    	        return (data) => {
    	            const value = data[token.name];
    	            if (value == null)
    	                return ["", token.name];
    	            if (!Array.isArray(value) || value.length === 0) {
    	                throw new TypeError(`Expected "${token.name}" to be a non-empty array`);
    	            }
    	            return [
    	                value
    	                    .map((value, index) => {
    	                    if (typeof value !== "string") {
    	                        throw new TypeError(`Expected "${token.name}/${index}" to be a string`);
    	                    }
    	                    return encodeValue(value);
    	                })
    	                    .join(delimiter),
    	            ];
    	        };
    	    }
    	    return (data) => {
    	        const value = data[token.name];
    	        if (value == null)
    	            return ["", token.name];
    	        if (typeof value !== "string") {
    	            throw new TypeError(`Expected "${token.name}" to be a string`);
    	        }
    	        return [encodeValue(value)];
    	    };
    	}
    	/**
    	 * Transform a path into a match function.
    	 */
    	function match(path, options = {}) {
    	    const { decode = decodeURIComponent, delimiter = DEFAULT_DELIMITER } = options;
    	    const { regexp, keys } = pathToRegexp(path, options);
    	    const decoders = keys.map((key) => {
    	        if (decode === false)
    	            return NOOP_VALUE;
    	        if (key.type === "param")
    	            return decode;
    	        return (value) => value.split(delimiter).map(decode);
    	    });
    	    return function match(input) {
    	        const m = regexp.exec(input);
    	        if (!m)
    	            return false;
    	        const path = m[0];
    	        const params = Object.create(null);
    	        for (let i = 1; i < m.length; i++) {
    	            if (m[i] === undefined)
    	                continue;
    	            const key = keys[i - 1];
    	            const decoder = decoders[i - 1];
    	            params[key.name] = decoder(m[i]);
    	        }
    	        return { path, params };
    	    };
    	}
    	function pathToRegexp(path, options = {}) {
    	    const { delimiter = DEFAULT_DELIMITER, end = true, sensitive = false, trailing = true, } = options;
    	    const keys = [];
    	    const sources = [];
    	    const flags = sensitive ? "" : "i";
    	    const paths = Array.isArray(path) ? path : [path];
    	    const items = paths.map((path) => path instanceof TokenData ? path : parse(path, options));
    	    for (const { tokens } of items) {
    	        for (const seq of flatten(tokens, 0, [])) {
    	            const regexp = sequenceToRegExp(seq, delimiter, keys);
    	            sources.push(regexp);
    	        }
    	    }
    	    let pattern = `^(?:${sources.join("|")})`;
    	    if (trailing)
    	        pattern += `(?:${escape(delimiter)}$)?`;
    	    pattern += end ? "$" : `(?=${escape(delimiter)}|$)`;
    	    const regexp = new RegExp(pattern, flags);
    	    return { regexp, keys };
    	}
    	/**
    	 * Generate a flat list of sequence tokens from the given tokens.
    	 */
    	function* flatten(tokens, index, init) {
    	    if (index === tokens.length) {
    	        return yield init;
    	    }
    	    const token = tokens[index];
    	    if (token.type === "group") {
    	        const fork = init.slice();
    	        for (const seq of flatten(token.tokens, 0, fork)) {
    	            yield* flatten(tokens, index + 1, seq);
    	        }
    	    }
    	    else {
    	        init.push(token);
    	    }
    	    yield* flatten(tokens, index + 1, init);
    	}
    	/**
    	 * Transform a flat sequence of tokens into a regular expression.
    	 */
    	function sequenceToRegExp(tokens, delimiter, keys) {
    	    let result = "";
    	    let backtrack = "";
    	    let isSafeSegmentParam = true;
    	    for (let i = 0; i < tokens.length; i++) {
    	        const token = tokens[i];
    	        if (token.type === "text") {
    	            result += escape(token.value);
    	            backtrack += token.value;
    	            isSafeSegmentParam || (isSafeSegmentParam = token.value.includes(delimiter));
    	            continue;
    	        }
    	        if (token.type === "param" || token.type === "wildcard") {
    	            if (!isSafeSegmentParam && !backtrack) {
    	                throw new TypeError(`Missing text after "${token.name}": ${DEBUG_URL}`);
    	            }
    	            if (token.type === "param") {
    	                result += `(${negate(delimiter, isSafeSegmentParam ? "" : backtrack)}+)`;
    	            }
    	            else {
    	                result += `([\\s\\S]+)`;
    	            }
    	            keys.push(token);
    	            backtrack = "";
    	            isSafeSegmentParam = false;
    	            continue;
    	        }
    	    }
    	    return result;
    	}
    	function negate(delimiter, backtrack) {
    	    if (backtrack.length < 2) {
    	        if (delimiter.length < 2)
    	            return `[^${escape(delimiter + backtrack)}]`;
    	        return `(?:(?!${escape(delimiter)})[^${escape(backtrack)}])`;
    	    }
    	    if (delimiter.length < 2) {
    	        return `(?:(?!${escape(backtrack)})[^${escape(delimiter)}])`;
    	    }
    	    return `(?:(?!${escape(backtrack)}|${escape(delimiter)})[\\s\\S])`;
    	}
    	/**
    	 * Stringify token data into a path string.
    	 */
    	function stringify(data) {
    	    return data.tokens
    	        .map(function stringifyToken(token, index, tokens) {
    	        if (token.type === "text")
    	            return escapeText(token.value);
    	        if (token.type === "group") {
    	            return `{${token.tokens.map(stringifyToken).join("")}}`;
    	        }
    	        const isSafe = isNameSafe(token.name) && isNextNameSafe(tokens[index + 1]);
    	        const key = isSafe ? token.name : JSON.stringify(token.name);
    	        if (token.type === "param")
    	            return `:${key}`;
    	        if (token.type === "wildcard")
    	            return `*${key}`;
    	        throw new TypeError(`Unexpected token: ${token}`);
    	    })
    	        .join("");
    	}
    	function isNameSafe(name) {
    	    const [first, ...rest] = name;
    	    if (!ID_START.test(first))
    	        return false;
    	    return rest.every((char) => ID_CONTINUE.test(char));
    	}
    	function isNextNameSafe(token) {
    	    if ((token === null || token === void 0 ? void 0 : token.type) !== "text")
    	        return true;
    	    return !ID_CONTINUE.test(token.value[0]);
    	}
    	
    	return dist;
    }

    var distExports = requireDist();

    /**
     * @author Giuliano Collacchioni @2020
     */
    const LEADING_DELIMITER = /^[\\\/]+/;
    const TRAILING_DELIMITER = /[\\\/]+$/;
    const DELIMITER_NOT_IN_PARENTHESES = /[\\\/]+(?![^(]*[)])/g;
    function prepare(path) {
        return ("/" + path).replace(TRAILING_DELIMITER, "/").replace(DELIMITER_NOT_IN_PARENTHESES, "/");
    }
    function generate(path) {
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
        return distExports.pathToRegexp(path); // , { end: false }); // is this needed?
    }

    var PathGenerator = /*#__PURE__*/Object.freeze({
        __proto__: null,
        DELIMITER_NOT_IN_PARENTHESES: DELIMITER_NOT_IN_PARENTHESES,
        LEADING_DELIMITER: LEADING_DELIMITER,
        TRAILING_DELIMITER: TRAILING_DELIMITER,
        generate: generate,
        prepare: prepare
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
            const { regexp: pathRegexp } = generate(path);
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

    const token = '%[a-f0-9]{2}';
    const singleMatcher = new RegExp('(' + token + ')|([^%]+?)', 'gi');
    const multiMatcher = new RegExp('(' + token + ')+', 'gi');

    function decodeComponents(components, split) {
    	try {
    		// Try to decode the entire string first
    		return [decodeURIComponent(components.join(''))];
    	} catch {
    		// Do nothing
    	}

    	if (components.length === 1) {
    		return components;
    	}

    	split = split || 1;

    	// Split the array in 2 parts
    	const left = components.slice(0, split);
    	const right = components.slice(split);

    	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
    }

    function decode$1(input) {
    	try {
    		return decodeURIComponent(input);
    	} catch {
    		let tokens = input.match(singleMatcher) || [];

    		for (let i = 1; i < tokens.length; i++) {
    			input = decodeComponents(tokens, i).join('');

    			tokens = input.match(singleMatcher) || [];
    		}

    		return input;
    	}
    }

    function customDecodeURIComponent(input) {
    	// Keep track of all the replacements and prefill the map with the `BOM`
    	const replaceMap = {
    		'%FE%FF': '\uFFFD\uFFFD',
    		'%FF%FE': '\uFFFD\uFFFD',
    	};

    	let match = multiMatcher.exec(input);
    	while (match) {
    		try {
    			// Decode as big chunks as possible
    			replaceMap[match[0]] = decodeURIComponent(match[0]);
    		} catch {
    			const result = decode$1(match[0]);

    			if (result !== match[0]) {
    				replaceMap[match[0]] = result;
    			}
    		}

    		match = multiMatcher.exec(input);
    	}

    	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
    	replaceMap['%C2'] = '\uFFFD';

    	const entries = Object.keys(replaceMap);

    	for (const key of entries) {
    		// Replace all decoded components
    		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
    	}

    	return input;
    }

    function decodeUriComponent(encodedURI) {
    	if (typeof encodedURI !== 'string') {
    		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
    	}

    	try {
    		// Try the built in decoder first
    		return decodeURIComponent(encodedURI);
    	} catch {
    		// Fallback to a more advanced decoder
    		return customDecodeURIComponent(encodedURI);
    	}
    }

    function includeKeys(object, predicate) {
    	const result = {};

    	if (Array.isArray(predicate)) {
    		for (const key of predicate) {
    			const descriptor = Object.getOwnPropertyDescriptor(object, key);
    			if (descriptor?.enumerable) {
    				Object.defineProperty(result, key, descriptor);
    			}
    		}
    	} else {
    		// `Reflect.ownKeys()` is required to retrieve symbol properties
    		for (const key of Reflect.ownKeys(object)) {
    			const descriptor = Object.getOwnPropertyDescriptor(object, key);
    			if (descriptor.enumerable) {
    				const value = object[key];
    				if (predicate(key, value, object)) {
    					Object.defineProperty(result, key, descriptor);
    				}
    			}
    		}
    	}

    	return result;
    }

    function splitOnFirst(string, separator) {
    	if (!(typeof string === 'string' && typeof separator === 'string')) {
    		throw new TypeError('Expected the arguments to be of type `string`');
    	}

    	if (string === '' || separator === '') {
    		return [];
    	}

    	const separatorIndex = string.indexOf(separator);

    	if (separatorIndex === -1) {
    		return [];
    	}

    	return [
    		string.slice(0, separatorIndex),
    		string.slice(separatorIndex + separator.length)
    	];
    }

    const isNullOrUndefined = value => value === null || value === undefined;

    // eslint-disable-next-line unicorn/prefer-code-point
    const strictUriEncode = string => encodeURIComponent(string).replaceAll(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

    const encodeFragmentIdentifier = Symbol('encodeFragmentIdentifier');

    function encoderForArrayFormat(options) {
    	switch (options.arrayFormat) {
    		case 'index': {
    			return key => (result, value) => {
    				const index = result.length;

    				if (
    					value === undefined
    					|| (options.skipNull && value === null)
    					|| (options.skipEmptyString && value === '')
    				) {
    					return result;
    				}

    				if (value === null) {
    					return [
    						...result, [encode(key, options), '[', index, ']'].join(''),
    					];
    				}

    				return [
    					...result,
    					[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join(''),
    				];
    			};
    		}

    		case 'bracket': {
    			return key => (result, value) => {
    				if (
    					value === undefined
    					|| (options.skipNull && value === null)
    					|| (options.skipEmptyString && value === '')
    				) {
    					return result;
    				}

    				if (value === null) {
    					return [
    						...result,
    						[encode(key, options), '[]'].join(''),
    					];
    				}

    				return [
    					...result,
    					[encode(key, options), '[]=', encode(value, options)].join(''),
    				];
    			};
    		}

    		case 'colon-list-separator': {
    			return key => (result, value) => {
    				if (
    					value === undefined
    					|| (options.skipNull && value === null)
    					|| (options.skipEmptyString && value === '')
    				) {
    					return result;
    				}

    				if (value === null) {
    					return [
    						...result,
    						[encode(key, options), ':list='].join(''),
    					];
    				}

    				return [
    					...result,
    					[encode(key, options), ':list=', encode(value, options)].join(''),
    				];
    			};
    		}

    		case 'comma':
    		case 'separator':
    		case 'bracket-separator': {
    			const keyValueSeparator = options.arrayFormat === 'bracket-separator'
    				? '[]='
    				: '=';

    			return key => (result, value) => {
    				if (
    					value === undefined
    					|| (options.skipNull && value === null)
    					|| (options.skipEmptyString && value === '')
    				) {
    					return result;
    				}

    				// Translate null to an empty string so that it doesn't serialize as 'null'
    				value = value === null ? '' : value;

    				if (result.length === 0) {
    					return [[encode(key, options), keyValueSeparator, encode(value, options)].join('')];
    				}

    				return [[result, encode(value, options)].join(options.arrayFormatSeparator)];
    			};
    		}

    		default: {
    			return key => (result, value) => {
    				if (
    					value === undefined
    					|| (options.skipNull && value === null)
    					|| (options.skipEmptyString && value === '')
    				) {
    					return result;
    				}

    				if (value === null) {
    					return [
    						...result,
    						encode(key, options),
    					];
    				}

    				return [
    					...result,
    					[encode(key, options), '=', encode(value, options)].join(''),
    				];
    			};
    		}
    	}
    }

    function parserForArrayFormat(options) {
    	let result;

    	switch (options.arrayFormat) {
    		case 'index': {
    			return (key, value, accumulator) => {
    				result = /\[(\d*)]$/.exec(key);

    				key = key.replace(/\[\d*]$/, '');

    				if (!result) {
    					accumulator[key] = value;
    					return;
    				}

    				if (accumulator[key] === undefined) {
    					accumulator[key] = {};
    				}

    				accumulator[key][result[1]] = value;
    			};
    		}

    		case 'bracket': {
    			return (key, value, accumulator) => {
    				result = /(\[])$/.exec(key);
    				key = key.replace(/\[]$/, '');

    				if (!result) {
    					accumulator[key] = value;
    					return;
    				}

    				if (accumulator[key] === undefined) {
    					accumulator[key] = [value];
    					return;
    				}

    				accumulator[key] = [...accumulator[key], value];
    			};
    		}

    		case 'colon-list-separator': {
    			return (key, value, accumulator) => {
    				result = /(:list)$/.exec(key);
    				key = key.replace(/:list$/, '');

    				if (!result) {
    					accumulator[key] = value;
    					return;
    				}

    				if (accumulator[key] === undefined) {
    					accumulator[key] = [value];
    					return;
    				}

    				accumulator[key] = [...accumulator[key], value];
    			};
    		}

    		case 'comma':
    		case 'separator': {
    			return (key, value, accumulator) => {
    				const isArray = typeof value === 'string' && value.includes(options.arrayFormatSeparator);
    				const isEncodedArray = (typeof value === 'string' && !isArray && decode(value, options).includes(options.arrayFormatSeparator));
    				value = isEncodedArray ? decode(value, options) : value;
    				const newValue = isArray || isEncodedArray ? value.split(options.arrayFormatSeparator).map(item => decode(item, options)) : (value === null ? value : decode(value, options));
    				accumulator[key] = newValue;
    			};
    		}

    		case 'bracket-separator': {
    			return (key, value, accumulator) => {
    				const isArray = /(\[])$/.test(key);
    				key = key.replace(/\[]$/, '');

    				if (!isArray) {
    					accumulator[key] = value ? decode(value, options) : value;
    					return;
    				}

    				const arrayValue = value === null
    					? []
    					: decode(value, options).split(options.arrayFormatSeparator);

    				if (accumulator[key] === undefined) {
    					accumulator[key] = arrayValue;
    					return;
    				}

    				accumulator[key] = [...accumulator[key], ...arrayValue];
    			};
    		}

    		default: {
    			return (key, value, accumulator) => {
    				if (accumulator[key] === undefined) {
    					accumulator[key] = value;
    					return;
    				}

    				accumulator[key] = [...[accumulator[key]].flat(), value];
    			};
    		}
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

    function parseValue(value, options, type) {
    	if (type === 'string' && typeof value === 'string') {
    		return value;
    	}

    	if (typeof type === 'function' && typeof value === 'string') {
    		return type(value);
    	}

    	if (options.parseBooleans && value !== null && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
    		return value.toLowerCase() === 'true';
    	}

    	if (type === 'number' && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
    		return Number(value);
    	}

    	if (options.parseNumbers && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
    		return Number(value);
    	}

    	return value;
    }

    function extract(input) {
    	input = removeHash(input);
    	const queryStart = input.indexOf('?');
    	if (queryStart === -1) {
    		return '';
    	}

    	return input.slice(queryStart + 1);
    }

    function parse(query, options) {
    	options = {
    		decode: true,
    		sort: true,
    		arrayFormat: 'none',
    		arrayFormatSeparator: ',',
    		parseNumbers: false,
    		parseBooleans: false,
    		types: Object.create(null),
    		...options,
    	};

    	validateArrayFormatSeparator(options.arrayFormatSeparator);

    	const formatter = parserForArrayFormat(options);

    	// Create an object with no prototype
    	const returnValue = Object.create(null);

    	if (typeof query !== 'string') {
    		return returnValue;
    	}

    	query = query.trim().replace(/^[?#&]/, '');

    	if (!query) {
    		return returnValue;
    	}

    	for (const parameter of query.split('&')) {
    		if (parameter === '') {
    			continue;
    		}

    		const parameter_ = options.decode ? parameter.replaceAll('+', ' ') : parameter;

    		let [key, value] = splitOnFirst(parameter_, '=');

    		if (key === undefined) {
    			key = parameter_;
    		}

    		// Missing `=` should be `null`:
    		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
    		value = value === undefined ? null : (['comma', 'separator', 'bracket-separator'].includes(options.arrayFormat) ? value : decode(value, options));
    		formatter(decode(key, options), value, returnValue);
    	}

    	for (const [key, value] of Object.entries(returnValue)) {
    		if (typeof value === 'object' && value !== null && options.types[key] !== 'string') {
    			for (const [key2, value2] of Object.entries(value)) {
    				const type = options.types[key] ? options.types[key].replace('[]', '') : undefined;
    				value[key2] = parseValue(value2, options, type);
    			}
    		} else if (typeof value === 'object' && value !== null && options.types[key] === 'string') {
    			returnValue[key] = Object.values(value).join(options.arrayFormatSeparator);
    		} else {
    			returnValue[key] = parseValue(value, options, options.types[key]);
    		}
    	}

    	if (options.sort === false) {
    		return returnValue;
    	}

    	// TODO: Remove the use of `reduce`.
    	// eslint-disable-next-line unicorn/no-array-reduce
    	return (options.sort === true ? Object.keys(returnValue).sort() : Object.keys(returnValue).sort(options.sort)).reduce((result, key) => {
    		const value = returnValue[key];
    		result[key] = Boolean(value) && typeof value === 'object' && !Array.isArray(value) ? keysSorter(value) : value;
    		return result;
    	}, Object.create(null));
    }

    function stringify(object, options) {
    	if (!object) {
    		return '';
    	}

    	options = {
    		encode: true,
    		strict: true,
    		arrayFormat: 'none',
    		arrayFormatSeparator: ',',
    		...options,
    	};

    	validateArrayFormatSeparator(options.arrayFormatSeparator);

    	const shouldFilter = key => (
    		(options.skipNull && isNullOrUndefined(object[key]))
    		|| (options.skipEmptyString && object[key] === '')
    	);

    	const formatter = encoderForArrayFormat(options);

    	const objectCopy = {};

    	for (const [key, value] of Object.entries(object)) {
    		if (!shouldFilter(key)) {
    			objectCopy[key] = value;
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
    }

    function parseUrl(url, options) {
    	options = {
    		decode: true,
    		...options,
    	};

    	let [url_, hash] = splitOnFirst(url, '#');

    	if (url_ === undefined) {
    		url_ = url;
    	}

    	return {
    		url: url_?.split('?')?.[0] ?? '',
    		query: parse(extract(url), options),
    		...(options && options.parseFragmentIdentifier && hash ? {fragmentIdentifier: decode(hash, options)} : {}),
    	};
    }

    function stringifyUrl(object, options) {
    	options = {
    		encode: true,
    		strict: true,
    		[encodeFragmentIdentifier]: true,
    		...options,
    	};

    	const url = removeHash(object.url).split('?')[0] || '';
    	const queryFromUrl = extract(object.url);

    	const query = {
    		...parse(queryFromUrl, {sort: false}),
    		...object.query,
    	};

    	let queryString = stringify(query, options);
    	queryString &&= `?${queryString}`;

    	let hash = getHash(object.url);
    	if (typeof object.fragmentIdentifier === 'string') {
    		const urlObjectForFragmentEncode = new URL(url);
    		urlObjectForFragmentEncode.hash = object.fragmentIdentifier;
    		hash = options[encodeFragmentIdentifier] ? urlObjectForFragmentEncode.hash : `#${object.fragmentIdentifier}`;
    	}

    	return `${url}${queryString}${hash}`;
    }

    function pick(input, filter, options) {
    	options = {
    		parseFragmentIdentifier: true,
    		[encodeFragmentIdentifier]: false,
    		...options,
    	};

    	const {url, query, fragmentIdentifier} = parseUrl(input, options);

    	return stringifyUrl({
    		url,
    		query: includeKeys(query, filter),
    		fragmentIdentifier,
    	}, options);
    }

    function exclude(input, filter, options) {
    	const exclusionFilter = Array.isArray(filter) ? key => !filter.includes(key) : (key, value) => !filter(key, value);

    	return pick(input, exclusionFilter, options);
    }

    var queryString = /*#__PURE__*/Object.freeze({
        __proto__: null,
        exclude: exclude,
        extract: extract,
        parse: parse,
        parseUrl: parseUrl,
        pick: pick,
        stringify: stringify,
        stringifyUrl: stringifyUrl
    });

    /**
     * @author Giuliano Collacchioni @2020
     */
    const DIVIDER = "#R!:";
    // add a listener to popstate event to stop propagation on option handling
    let catchPopState$1 = null;
    let destroyEventListener$2 = null;
    function initEventListener$3() {
        if (destroyEventListener$2 !== null) {
            return destroyEventListener$2;
        }
        const listener = (event) => {
            if (catchPopState$1 == null) {
                return;
            }
            event.stopImmediatePropagation();
            event.stopPropagation();
            catchPopState$1();
        };
        window.addEventListener("popstate", listener, true);
        // remove options of just loaded page
        if (Object.keys(get$1()).length > 0) {
            set({});
        }
        return destroyEventListener$2 = () => {
            window.removeEventListener("popstate", listener, true);
            destroyEventListener$2 = null;
        };
    }
    function onCatchPopState$2(onCatchPopState, once = false) {
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
        return goTo(newHref, true);
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
        return goTo(newHref, replace);
    }
    /**
     * Get the href with the options portion
     */
    function clearHref() {
        return splitHref()[0];
    }

    var OptionsManager = /*#__PURE__*/Object.freeze({
        __proto__: null,
        add: add,
        clearHref: clearHref,
        get: get$1,
        goWith: goWith,
        initEventListener: initEventListener$3,
        remove: remove,
        set: set
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
        construct: construct,
        get: get
    });

    function createWork(locking, state) {
        let finished = false;
        let finishing = false;
        const { works, onworkfinished } = state;
        const work = {
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

    function onCatchPopState$1(onCatchPopState, once = false, internalState) {
        if (once) {
            const tmpOnCatchPopState = onCatchPopState;
            onCatchPopState = () => {
                internalState.catchPopState = null;
                tmpOnCatchPopState();
            };
        }
        internalState.catchPopState = onCatchPopState;
    }

    async function awaitableCatchPopState(internalState, executor) {
        const awaiter = new Promise(resolve => {
            onCatchPopState$1(resolve, true, internalState);
        });
        executor();
        await awaiter;
    }

    function goToHREF(href, replace = false) {
        if (window.location.href === construct(href, true)) {
            window.dispatchEvent(new Event("popstate"));
            return;
        }
        href = construct(href);
        if (href[0] === "#") {
            if (replace) {
                window.location.replace(href);
            }
            else {
                window.location.assign(href);
            }
            return;
        }
        if (replace) {
            window.history.replaceState({}, "", href);
        }
        else {
            window.history.pushState({}, "", href);
        }
        window.dispatchEvent(new Event("popstate"));
    }

    async function addFront(frontHref, internalState) {
        const href = get();
        const work = createWork(false, internalState);
        await goWith(construct(frontHref, true), { back: undefined, front: null });
        await awaitableCatchPopState(internalState, () => {
            window.history.go(-1);
        });
        await awaitableCatchPopState(internalState, () => {
            goToHREF(href, true);
        });
        work.finish();
    }

    function onLanded(internalState) {
        window.dispatchEvent(new Event("historylanded"));
        if (internalState.workToRelease == null) {
            return;
        }
        const work = internalState.workToRelease;
        internalState.workToRelease = null;
        work.finish();
    }

    async function goBackward(internalState) {
        const { contextManager } = internalState;
        const frontHref = contextManager.get();
        const href = contextManager.goBackward();
        if (contextManager.index() > 0) {
            await awaitableCatchPopState(internalState, () => {
                window.history.go(1);
            });
        }
        await awaitableCatchPopState(internalState, () => {
            goToHREF(href, true);
        });
        await addFront(frontHref, internalState);
        internalState.hasBack = contextManager.index() > 0;
        onLanded(internalState);
    }

    async function addBack(backHref, internalState) {
        const href = get();
        const work = createWork(false, internalState);
        await awaitableCatchPopState(internalState, () => {
            window.history.go(-1);
        });
        if (backHref) {
            await awaitableCatchPopState(internalState, () => {
                goToHREF(backHref, true);
            });
        }
        await set({ back: null, front: undefined });
        await awaitableCatchPopState(internalState, () => {
            goToHREF(href);
        });
        work.finish();
    }

    async function goForward(internalState) {
        const { contextManager } = internalState;
        const backHref = contextManager.get();
        const href = contextManager.goForward();
        if (internalState.hasBack) {
            await awaitableCatchPopState(internalState, () => {
                window.history.go(-1);
            });
        }
        await awaitableCatchPopState(internalState, () => {
            goToHREF(href, true);
        });
        await addBack(backHref, internalState);
        if (contextManager.index() < contextManager.length() - 1) {
            await addFront(contextManager.get(contextManager.index() + 1), internalState);
            // await awaitableCatchPopState(internalState, () => {
            //     addFront(
            //         contextManager.get(contextManager.index() + 1)!,
            //         internalState
            //     );
            // });
        }
        internalState.hasBack = true;
        onLanded(internalState);
    }

    async function goToNewPage(internalState) {
        const { contextManager, historyManaged, replacing } = internalState;
        const href = get();
        const backHref = contextManager.get();
        if (href === backHref || !historyManaged) {
            return onLanded(internalState);
        }
        const replaced = replacing;
        internalState.replacing = false;
        const willHaveBack = internalState.hasBack || !replaced;
        contextManager.insert(href, replaced);
        if (internalState.hasBack && !replaced) {
            await awaitableCatchPopState(internalState, () => {
                window.history.go(-1);
            });
        }
        if (!replaced) {
            await addBack(backHref, internalState);
        }
        await awaitableCatchPopState(internalState, () => {
            goToHREF(href, true);
        });
        internalState.hasBack = willHaveBack;
        onLanded(internalState);
    }

    function handlePopState$1(internalState) {
        let options = {
            ...get$1(),
            ...(internalState.historyManaged ?
                {} : { front: undefined, back: undefined })
        };
        if (options.locked) {
            onCatchPopState$1(() => {
                if (get$1().locked) {
                    handlePopState$1(internalState);
                }
            }, true, internalState);
            window.history.go(-1);
            return;
        }
        if (options.front !== undefined) {
            const frontEvent = new Event("historyforward", { cancelable: true });
            window.dispatchEvent(frontEvent);
            if (frontEvent.defaultPrevented) {
                onCatchPopState$1(() => { return; }, true, internalState);
                window.history.go(-1);
                return;
            }
            goForward(internalState);
            return;
        }
        if (options.back !== undefined) {
            let backEvent = new Event("historybackward", { cancelable: true });
            window.dispatchEvent(backEvent);
            if (backEvent.defaultPrevented) {
                onCatchPopState$1(() => { return; }, true, internalState);
                window.history.go(+1);
                return;
            }
            goBackward(internalState);
            return;
        }
        goToNewPage(internalState);
    }

    function isLocked$1(internalState) {
        return internalState.works.some(w => w.locking);
    }

    function initEventListener$2(internalState) {
        if (internalState.destroyEventListener !== null) {
            return internalState.destroyEventListener;
        }
        const destroyOptionsEventListener = initEventListener$3();
        const listener = (event) => {
            if (!internalState.started || isLocked$1(internalState)) {
                return;
            }
            const { catchPopState } = internalState;
            if (catchPopState == null) {
                handlePopState$1(internalState);
                return;
            }
            event.stopImmediatePropagation();
            catchPopState();
        };
        window.addEventListener("popstate", listener, true);
        return internalState.destroyEventListener = () => {
            window.removeEventListener("popstate", listener, true);
            destroyOptionsEventListener();
            internalState.destroyEventListener = null;
        };
    }

    /**
     * @author Giuliano Collacchioni @2020
     */
    const state = {
        started: false,
        historyManaged: null,
        works: [],
        onworkfinished: [],
        workToRelease: null,
        contextManager: new ContextManager(),
        hasBack: false,
        replacing: false,
        catchPopState: null,
        destroyEventListener: null
    };
    function setAutoManagement(value) {
        if (state.started) {
            throw new Error("HistoryManager already started");
        }
        state.historyManaged = !!value;
    }
    function getAutoManagement() {
        return state.historyManaged || false;
    }
    function onWorkFinished(callback, context) {
        if (state.works.length === 0) {
            callback.call(context || null);
            return;
        }
        state.onworkfinished.push([callback, context || null]);
    }
    function acquire() {
        let lock = createWork(true, state);
        return lock;
    }
    function index$1() {
        return state.contextManager.index();
    }
    function getHREFAt(index) {
        return state.contextManager.get(index);
    }
    function setContext$1(context) {
        if (state.historyManaged === null) {
            state.historyManaged = true;
        }
        return state.contextManager.setContext(context);
    }
    function addContextPath$1(context, href, isFallback = false) {
        if (state.historyManaged === null) {
            state.historyManaged = true;
        }
        return state.contextManager.addContextPath(context, href, isFallback);
    }
    function setContextDefaultHref$1(context, href) {
        if (state.historyManaged === null) {
            state.historyManaged = true;
        }
        return state.contextManager.setContextDefaultHref(context, href);
    }
    function getContextDefaultOf$1(context) {
        return state.contextManager.getDefaultOf(context);
    }
    function getContext$1(href = null) {
        if (href == null) {
            return state.contextManager.currentContext();
        }
        return state.contextManager.contextOf(href);
    }
    function getHREFs() {
        if (!state.historyManaged) {
            throw new Error("can't keep track of hrefs without history management");
        }
        return state.contextManager.hrefs();
    }
    function tryUnlock() {
        let locksAsked = 0;
        for (let i = state.works.length - 1; i >= 0; i--) {
            const work = state.works[i];
            if (work.locking && !work.finishing) {
                if (!work.askFinish()) {
                    return -1;
                }
                locksAsked++;
            }
        }
        return locksAsked;
    }
    function restore(context) {
        if (!state.historyManaged) {
            throw new Error("can't restore a context without history management");
        }
        const locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise((_, reject) => { reject(); });
        }
        let promiseResolve;
        let promise = new Promise(resolve => { promiseResolve = resolve; });
        onWorkFinished(() => {
            const { contextManager } = state;
            const previousIndex = contextManager.index();
            if (contextManager.restore(context)) {
                let replace = previousIndex >= contextManager.index();
                state.workToRelease = createWork(false, state);
                onWorkFinished(promiseResolve);
                const href = contextManager.get();
                const hadBack = state.hasBack;
                (new Promise(resolve => {
                    if (!replace && !state.hasBack) {
                        onCatchPopState$1(resolve, true, state);
                        goToHREF(href);
                    }
                    else {
                        resolve();
                    }
                }))
                    .then(() => new Promise(resolve => {
                    let index = contextManager.index() - 1;
                    if (replace && !state.hasBack) {
                        resolve();
                    }
                    else {
                        addBack(contextManager.get(index), state)
                            .then(() => {
                            state.hasBack = true;
                            resolve();
                        });
                    }
                }))
                    .then(() => new Promise(resolve => {
                    if (hadBack || replace) {
                        onCatchPopState$1(resolve, true, state);
                        goToHREF(href, true);
                    }
                    else {
                        resolve();
                    }
                }))
                    .then(() => {
                    onLanded(state);
                });
            }
            else {
                promiseResolve();
            }
        });
        return promise;
    }
    function assign(href) {
        const locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise((_, reject) => { reject(); });
        }
        let promiseResolve;
        let promise = new Promise(resolve => { promiseResolve = resolve; });
        onWorkFinished(() => {
            state.workToRelease = createWork(false, state);
            onWorkFinished(promiseResolve);
            goToHREF(href);
        });
        return promise;
    }
    function replace(href) {
        let locksFinished = tryUnlock();
        if (locksFinished === -1) {
            return new Promise((_, reject) => { reject(); });
        }
        let promiseResolve;
        let promise = new Promise(resolve => { promiseResolve = resolve; });
        onWorkFinished(() => {
            state.workToRelease = createWork(false, state);
            onWorkFinished(promiseResolve);
            goToHREF(href, state.replacing = true);
        });
        return promise;
    }
    function go$1(direction) {
        const locksFinished = tryUnlock();
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
            if (state.historyManaged === false) {
                window.history.go(direction);
                promiseResolve();
                return;
            }
            const contextIndex = state.contextManager.index();
            let index = Math.max(0, Math.min(state.contextManager.length() - 1, contextIndex + direction));
            if (contextIndex === index) {
                onLanded(state);
                promiseResolve();
                return;
            }
            state.workToRelease = createWork(false, state);
            onWorkFinished(promiseResolve);
            if (direction > 0) {
                state.contextManager.index(index - 1);
                window.history.go(1);
            }
            else {
                state.contextManager.index(index + 1);
                window.history.go(-1);
            }
        });
        return promise;
    }
    function start$1(fallbackContext) {
        if (state.historyManaged === null) {
            state.historyManaged = false;
        }
        fallbackContext = state.historyManaged ?
            (fallbackContext === void 0 ? state.contextManager.getContextNames()[0] : fallbackContext)
            : null;
        let href = get();
        let promiseResolve;
        let promiseReject;
        const promise = new Promise((resolve, reject) => {
            promiseResolve = resolve;
            promiseReject = reject;
        });
        if (state.historyManaged) {
            let context = state.contextManager.contextOf(href, false);
            if (context == null) {
                if (!fallbackContext) {
                    throw new Error("must define a fallback context");
                }
                let defaultHREF = state.contextManager.getDefaultOf(fallbackContext);
                if (defaultHREF == null) {
                    throw new Error("must define a default href for the fallback context");
                }
                state.started = true;
                href = defaultHREF;
                state.workToRelease = createWork(false, state);
                onCatchPopState$1(() => {
                    onLanded(state);
                    promiseResolve();
                }, true, state);
                goToHREF(defaultHREF, true);
            }
            state.contextManager.insert(href);
            if (context == null) {
                promiseReject();
                return promise;
            }
        }
        state.started = true;
        onLanded(state);
        promiseResolve();
        return promise;
    }
    function isStarted() {
        return state.started;
    }
    const historyManager = {
        setAutoManagement,
        getAutoManagement,
        onWorkFinished,
        acquire,
        initEventListener() {
            return initEventListener$2(state);
        },
        // addFront,
        // addBack,
        index: index$1,
        getHREFAt,
        setContext: setContext$1,
        addContextPath: addContextPath$1,
        setContextDefaultHref: setContextDefaultHref$1,
        getContextDefaultOf: getContextDefaultOf$1,
        getContext: getContext$1,
        getHREFs,
        restore,
        assign,
        replace,
        go: go$1,
        start: start$1,
        isStarted
    };

    var HistoryManager = /*#__PURE__*/Object.freeze({
        __proto__: null,
        default: historyManager
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
        historyManager.onWorkFinished(() => {
            historyLock = historyManager.acquire();
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
        locked: locked$1,
        unlock: unlock$1
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
        const destroyHistoryEventListener = historyManager.initEventListener();
        const destroyNavigationLockEventListener = initEventListener$1();
        window.addEventListener("historylanded", onland);
        return destroyEventListener = () => {
            window.removeEventListener("historylanded", onland);
            destroyNavigationLockEventListener();
            destroyHistoryEventListener();
            destroyEventListener = null;
        };
    }
    function _go(path, replace = false, emit = true) {
        let lastEmitRoute = emitRoute;
        emitRoute = emit;
        return (replace ? historyManager.replace(path) : historyManager.assign(path)).catch(() => {
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
            const { regexp: regex, keys } = generate(path);
            this[REDIRECTIONS].push({ regex, keys, redirection: prepare(redirection) });
            return regex;
        }
        /**
         * Elimina un reindirizzamento
         * @param path
         */
        unredirect(path) {
            _throwIfDestroyed(this);
            const { regexp: regex, keys } = generate(path);
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
            const { regexp: regex, keys } = generate(path);
            this[ROUTES].push({ regex, keys, callback });
            return regex;
        }
        /**
         * Elimina la funzione associata al percorso
         * @param path
         */
        unroute(path) {
            _throwIfDestroyed(this);
            const { regexp: regex, keys } = generate(path);
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
        return historyManager.start(startingContext);
    }
    function index() {
        return historyManager.index();
    }
    function getLocationAt(index) {
        let href = historyManager.getHREFAt(index);
        if (href == null) {
            return null;
        }
        return getLocation(href);
    }
    function addContextPath(context, href, isFallback = false) {
        return historyManager.addContextPath(context, href, isFallback);
    }
    function setContextDefaultHref(context, href) {
        return historyManager.setContextDefaultHref(context, href);
    }
    function setContext(context) {
        return historyManager.setContext(context);
    }
    function getContext(href) {
        return historyManager.getContext(href);
    }
    function restoreContext(context, defaultHref) {
        return historyManager.restore(context);
    }
    function getContextDefaultOf(context) {
        return historyManager.getContextDefaultOf(context);
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
    function go(path_index, options = {}) {
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
                historyManager.go(path_index).then(promiseResolve, () => {
                    emitRoute = lastEmitRoute;
                });
            }
        });
    }
    function setQueryParam(param, value, options) {
        let promiseResolve;
        let promise = new Promise(resolve => { promiseResolve = resolve; });
        historyManager.onWorkFinished(() => {
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
        NavigationLock: NavigationLock,
        addContextPath: addContextPath,
        create: create,
        destroy: destroy,
        emit: emit,
        getBase: getBase,
        getContext: getContext,
        getContextDefaultOf: getContextDefaultOf,
        getLocation: getLocation,
        getLocationAt: getLocationAt,
        go: go,
        index: index,
        initEventListener: initEventListener,
        isLocked: isLocked,
        lock: lock$1,
        redirect: redirect,
        restoreContext: restoreContext,
        route: route,
        setBase: setBase,
        setContext: setContext,
        setContextDefaultHref: setContextDefaultHref,
        setQueryParam: setQueryParam,
        start: start,
        unlock: unlock,
        unredirect: unredirect,
        unroute: unroute
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
            ondoneCallbacks.push([fn, null]);
            return;
        }
        fn.call(null);
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
        ondone: ondone,
        startWork: startWork
    });

    exports.ContextManager = ContextManager$1;
    exports.HistoryManager = HistoryManager;
    exports.NavigationLock = NavigationLock;
    exports.OptionsManager = OptionsManager;
    exports.PathGenerator = PathGenerator;
    exports.Router = Router;
    exports.URLManager = URLManager;
    exports.WorkManager = WorkManager;

}));
