(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "path-to-regexp"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var pathToRegexp = require("path-to-regexp");
    var LEADING_DELIMITER = /^[\\\/]+/;
    var TRAILING_DELIMITER = /[\\\/]+$/;
    var DELIMITER_NOT_IN_PARENTHESES = /[\\\/]+(?![^(]*[)])/g;
    function prepare(path) {
        return path.replace(LEADING_DELIMITER, "").replace(TRAILING_DELIMITER, "").replace(DELIMITER_NOT_IN_PARENTHESES, "/");
    }
    exports.prepare = prepare;
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
    exports.generate = generate;
});
