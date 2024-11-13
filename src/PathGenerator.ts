/**
 * @author Giuliano Collacchioni @2020
 */

import { pathToRegexp, Path, Key } from "path-to-regexp";

export const LEADING_DELIMITER: RegExp = /^[\\\/]+/;
export const TRAILING_DELIMITER: RegExp = /[\\\/]+$/;
export const DELIMITER_NOT_IN_PARENTHESES: RegExp = /[\\\/]+(?![^(]*[)])/g;

export function prepare(path: string): string {
    return ("/" + path).replace(TRAILING_DELIMITER, "/").replace(DELIMITER_NOT_IN_PARENTHESES, "/");
}
export function generate(path: Path) {
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
    return pathToRegexp(path); // , { end: false }); // is this needed?
}