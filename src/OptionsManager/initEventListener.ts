import get from "./get";
import getInternalState from "./getInternalState";
import set from "./set";

export default function initEventListener() {
    const internalState = getInternalState();

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
    if (Object.keys(get()).length > 0) {
        set({});
    }

    return internalState.destroyEventListener = () => {
        window.removeEventListener("popstate", listener, true);
        internalState.destroyEventListener = null;
    };
}