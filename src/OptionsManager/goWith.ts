import InternalOptionsManagerState from "../types/InternalOptionsManagerState";

import goTo from "./goTo";
import optsToStr from "./optsToStr";
import splitHref from "./splitHref";

/**
 * Go to the given href adding the specified options
 */
export default function goWith(
    href: string,
    opts: Record<string, any>,
    replace: boolean,
    internalState: InternalOptionsManagerState
) {
    return goTo(
        (
            splitHref(href, internalState)[0] +
            internalState.DIVIDER + optsToStr(opts)
        ), replace, internalState
    );
}