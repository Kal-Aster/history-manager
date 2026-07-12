/**
 * @author Giuliano Collacchioni @2020
 */

import { pathToRegexp, Path } from "path-to-regexp";

import {
    DELIMITER_NOT_IN_PARENTHESES,
    LEADING_DELIMITER,
    LEADING_OPTIONAL_DELIMITER,
    TRAILING_DELIMITER
} from "./constants";

function prepare(path: string): string {
    // Only inject a leading "/" when the path doesn't already begin with a
    // delimiter or with an optional group whose content starts with one
    // ("{/...}"). Prefixing those would strand a literal "/" in front of the
    // path-to-regexp v8 group and demand a doubled slash to match.
    if (!LEADING_DELIMITER.test(path) && !LEADING_OPTIONAL_DELIMITER.test(path)) {
        path = "/" + path;
    }
    return path
        .replace(TRAILING_DELIMITER, "/")
        .replace(DELIMITER_NOT_IN_PARENTHESES, "/");
}
function generate(path: Path) {
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
const PathGenerator = {
    prepare,
    generate
};
export default PathGenerator;