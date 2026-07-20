import Options from "../types/Options";

import goTo from "./goTo";
import joinHref from "./joinHref";
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
    return goTo(
        joinHref(
            splitHref(href)[0],
            optsToStr(opts)
        ), replace
    );
}