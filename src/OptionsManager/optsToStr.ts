import queryString from "../queryString";

import Options from "../types/Options";

/**
 * Converts options to a query-like string.
 * Returns an empty string when no option is left, so that callers can drop
 * the divider altogether instead of leaving a dangling one in the url
 */
export default function optsToStr(opts: Options) {
    return queryString.stringify(Object.fromEntries(
        Object.entries(opts).filter(([, value]) => {
            return value !== undefined
        })
    ));
}