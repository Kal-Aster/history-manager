import queryString from "query-string";

import Options from "../types/Options";

import splitHref from "./splitHref";

/**
 * Gets the options stored in the url
 */
export default function get(): Options {
    return queryString.parse(splitHref(
        window.location.href
    )[1]);
}