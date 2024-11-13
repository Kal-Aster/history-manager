/**
 * @author Giuliano Collacchioni @2020
 */
import { Path } from "path-to-regexp";
export declare const LEADING_DELIMITER: RegExp;
export declare const TRAILING_DELIMITER: RegExp;
export declare const DELIMITER_NOT_IN_PARENTHESES: RegExp;
export declare function prepare(path: string): string;
export declare function generate(path: Path): {
    regexp: RegExp;
    keys: import("path-to-regexp").Keys;
};
