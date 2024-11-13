import InternalOptionsManagerState from "../types/InternalOptionsManagerState";
import goTo from "./goTo";
import optsToStr from "./optsToStr";
import splitHref from "./splitHref";

/**
 * Sets the options
 */
export default function set(
    opts: Record<string, any>,
    internalState: InternalOptionsManagerState
): Promise<void> {
    let newHref: string = splitHref(
        window.location.href, internalState
    )[0] + internalState.DIVIDER + optsToStr(opts);
    return goTo(newHref, true, internalState);
}