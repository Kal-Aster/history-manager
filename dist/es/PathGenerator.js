import { p as pathToRegexp } from './index-c2fda29c.js';

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

export { generate, prepare };
