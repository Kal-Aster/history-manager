/**
 * @author Giuliano Collacchioni @2020
 */

import InternalOptionsManagerState from "../types/InternalOptionsManagerState";

import add from "./add";
import get from "./get";
import goWith from "./goWith";
import initEventListener from "./initEventListener";
import remove from "./remove";
import set from "./set";
import splitHref from "./splitHref";

const internalState: InternalOptionsManagerState = {
    DIVIDER: "#R!:",
    catchPopState: null,
    destroyEventListener: null
}

/**
 * Get the href with the options portion
 */
function clearHref(): string {
    return splitHref(window.location.href, internalState)[0];
}

const OptionsManager = {
    initEventListener() {
        return initEventListener(internalState);
    },
    get() {
        return get(internalState);
    },
    set(opts: Record<string, any>) {
        return set(opts, internalState);
    },
    add(
        opt: string,
        value?: string
    ) {
        return add(opt, value, internalState);
    },
    remove(opt: string) {
        return remove(opt, internalState);
    },
    goWith(
        href: string,
        opts: Record<string, any>,
        replace: boolean = false
    ) {
        return goWith(href, opts, replace, internalState);
    },
    clearHref
};
export default OptionsManager;