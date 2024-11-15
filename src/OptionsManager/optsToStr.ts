import queryString from "query-string";

import Options from "../types/Options";

/**
 * Converts options to a query-like string
 */
export default function optsToStr(opts: Options) {
    return queryString.stringify(Object.fromEntries(
        Object.entries(opts).filter(([, value]) => {
            return value !== undefined
        })
    ));
}