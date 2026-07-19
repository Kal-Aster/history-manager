import getInternalState from "./getInternalState";

/**
 * Joins a clear href and a serialized options string.
 * When there is no option to store, the divider is left out entirely,
 * otherwise the url would keep a dangling divider (e.g. `/users/2#R!:`)
 */
export default function joinHref(clearHref: string, opts: string): string {
    if (!opts) {
        return clearHref;
    }

    const { DIVIDER } = getInternalState();
    return `${clearHref}${DIVIDER}${opts}`;
}
