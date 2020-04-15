/**
 * @author Giuliano Collacchioni @2020
 */

import pathToRegexp = require("./lib/path-to-regexp");

const LEADING_DELIMITER: RegExp = /^[\\\/]+/;
const TRAILING_DELIMITER: RegExp = /[\\\/]+$/;
const DELIMITER_NOT_IN_PARENTHESES: RegExp = /[\\\/]+(?![^(]*[)])/g;

export function prepare(path: string): string {
    return path.replace(LEADING_DELIMITER, "").replace(TRAILING_DELIMITER, "").replace(DELIMITER_NOT_IN_PARENTHESES, "/");
}
export function generate(path: pathToRegexp.Path, keys?: pathToRegexp.Key[]): RegExp {
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