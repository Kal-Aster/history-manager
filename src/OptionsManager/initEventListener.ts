import InternalOptionsManagerState from "../types/InternalOptionsManagerState";
import get from "./get";
import set from "./set";

export default function initEventListener(
    internalState: InternalOptionsManagerState
) {
    if (internalState.destroyEventListener !== null) {
        return internalState.destroyEventListener;
    }

    const listener = (event: PopStateEvent) => {
        if (internalState.catchPopState == null) {
            return;
        }
        event.stopImmediatePropagation();
        event.stopPropagation();
        internalState.catchPopState();
    };
    window.addEventListener("popstate", listener, true);

    // remove options of just loaded page
    if (Object.keys(get(internalState)).length > 0) {
        set({}, internalState);
    }

    return internalState.destroyEventListener = () => {
        window.removeEventListener("popstate", listener, true);
        internalState.destroyEventListener = null;
    };
}