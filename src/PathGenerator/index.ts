/**
 * @author Giuliano Collacchioni @2020
 */

import { pathToRegexp, Path } from "path-to-regexp";

import {
    DELIMITER_NOT_IN_PARENTHESES,
    TRAILING_DELIMITER
} from "./constants";

function prepare(path: string): string {
    return ("/" + path).replace(TRAILING_DELIMITER, "/").replace(DELIMITER_NOT_IN_PARENTHESES, "/");
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