import Options from "../types/Options";

import goTo from "./goTo";
import joinHref from "./joinHref";
import optsToStr from "./optsToStr";
import splitHref from "./splitHref";

/**
 * Sets the options
 */
export default function set(opts: Options): Promise<void> {
    return goTo(
        joinHref(
            splitHref(window.location.href)[0],
            optsToStr(opts)
        ),
        true
    );
}
