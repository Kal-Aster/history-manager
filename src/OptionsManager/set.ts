import Options from "../types/Options";

import getInternalState from "./getInternalState";
import goTo from "./goTo";
import optsToStr from "./optsToStr";
import splitHref from "./splitHref";

/**
 * Sets the options
 */
export default function set(opts: Options): Promise<void> {
    const { DIVIDER } = getInternalState();
    return goTo(
        `${splitHref(window.location.href)[0]}${DIVIDER}${optsToStr(opts)}`,
        true
    );
}