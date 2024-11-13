import queryString from "query-string";

/**
 * Converts opts to a query-like string
 */
export default function optsToStr(opts: Record<string, any>) {
    return queryString.stringify(Object.fromEntries(
        Object.entries(opts).filter(([, value]) => {
            return value !== undefined
        })
    ));
}