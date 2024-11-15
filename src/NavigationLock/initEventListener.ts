import getInternalState from "./getInternalState";
import handlePopState from "./handlePopState";

export default function initEventListener() {
    const internalState = getInternalState();
    if (internalState.destroyEventListener !== null) {
        return internalState.destroyEventListener;
    }

    const listener = (event: PopStateEvent) => {
        if (internalState.catchPopState == null) {
            return handlePopState();
        }
        event.stopImmediatePropagation();
        internalState.catchPopState();
    };
    window.addEventListener("popstate", listener, true);
    return internalState.destroyEventListener = () => {
        window.removeEventListener("popstate", listener, true);
        internalState.destroyEventListener = null;
    };
}
