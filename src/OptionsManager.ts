/**
 * @author Giuliano Collacchioni @2020
 */

import * as qs from "query-string";

const DIVIDER: string = "#R!:";

// add a listener to popstate event to stop propagation on option handling
let catchPopState: (() => void) | null = null;
let destroyEventListener: (() => void) | null = null;
export function initEventListener() {
    if (destroyEventListener !== null) {
        return destroyEventListener;
    }

    const listener = (event: PopStateEvent) => {
        if (catchPopState == null) {
            return;
        }
        event.stopImmediatePropagation();
        event.stopPropagation();
        catchPopState();
    };
    window.addEventListener("popstate", listener, true);

    // remove options of just loaded page
    if (Object.keys(get()).length > 0) {
        set({});
    }

    return destroyEventListener = () => {
        window.removeEventListener("popstate", listener, true);
        destroyEventListener = null;
    };
}

function onCatchPopState(onCatchPopState: () => void, once: boolean = false): void {
    if (once) {
        let tmpOnCatchPopState: () => void = onCatchPopState;
        onCatchPopState = () => {
            catchPopState = null;
            tmpOnCatchPopState();
        };
    }
    catchPopState = onCatchPopState;
}

function goTo(href: string, replace: boolean = false): Promise<void> {
    return new Promise<void>(resolve => {
        if (href === window.location.href) {
            return resolve();
        }
        onCatchPopState(resolve, true);
        if (href[0] === "#") {
            if (replace) {
                window.location.replace(href);
            } else {
                window.location.assign(href);
            }
        } else {
            if (replace) {
                window.history.replaceState({}, "", href);
            } else {
                window.history.pushState({}, "", href);
            }
            window.dispatchEvent(new Event("popstate"));
        }
    });
}

function splitHref(href: string = window.location.href): [string, string] {
    let splitted: string[] = href.split(DIVIDER);
    if (splitted.length > 2) {
        return [
            splitted.slice(0, splitted.length - 1).join(DIVIDER),
            splitted[splitted.length - 1]
        ];
    }
    return [ splitted[0], splitted[1] || "" ];
}

export type Options = { [key: string]: any };

/**
 * Converts opts to a query-like string
 * @param opts
 */
function optsToStr(opts: Options): string {
    let filteredOpts: Options = {};
    Object.entries(opts).forEach(([key, value]) => {
        if (value !== undefined) {
            filteredOpts[key] = value;
        }
    });
    return qs.stringify(filteredOpts);
}

/**
 * Gets the options stored in the url
 */
export function get(): Options {
    return qs.parse(splitHref()[1]);
}
/**
 * Sets the options
 * @param opts
 */
export function set(opts: Options): Promise<void> {
    let newHref: string = splitHref()[0] + DIVIDER + optsToStr(opts);
    return goTo(newHref, true);
}
/**
 * Add an option to those stored in the url
 */
export function add(opt: string, value?: string): Promise<void> {
    let opts: Options = get();
    if (opts[opt] === undefined || opts[opt] !== value) {
        opts[opt] = value || null;
        return set(opts);
    }
    return new Promise<void>(resolve => { resolve(); });
}
/**
 * Remove given option
 * @param opt
 */
export function remove(opt: string): Promise<void> {
    let opts: Options = get();
    if (opts[opt] !== undefined) {
        delete opts[opt];
        return set(opts);
    }
    return new Promise<void>(resolve => { resolve(); });
}

/**
 * Go to the given href adding the specified options
 * @param href
 * @param opts
 * @param replace
 */
export function goWith(href: string, opts: Options, replace: boolean = false): Promise<void> {
    let newHref: string = splitHref(href)[0] + DIVIDER + optsToStr(opts);
    return goTo(newHref, replace);
}

/**
 * Get the href with the options portion
 */
export function clearHref(): string {
    return splitHref()[0];
}