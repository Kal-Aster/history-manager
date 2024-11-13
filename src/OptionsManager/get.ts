import queryString from "query-string";
import splitHref from "./splitHref";
import InternalOptionsManagerState from "../types/InternalOptionsManagerState";

/**
 * Gets the options stored in the url
 */
export default function get(
    internalState: InternalOptionsManagerState
): Record<string, any> {
    return queryString.parse(splitHref(
        window.location.href, internalState
    )[1]);
}