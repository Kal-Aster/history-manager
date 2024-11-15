import Options from "../types/Options";

import getInternalState from "./getInternalState";
import goTo from "./goTo";
import optsToStr from "./optsToStr";
import splitHref from "./splitHref";

/**
 * Go to the given href adding the specified options
 */
export default function goWith(
    href: string,
    opts: Options,
    replace = false
) {
    const internalState = getInternalState();

    return goTo(
        (
            splitHref(href)[0] +
            internalState.DIVIDER + optsToStr(opts)
        ), replace
    );
}