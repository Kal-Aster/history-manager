import InternalNavigationLockState from "../types/InternalNavigationLockState";
import handlePopState from "./handlePopState";

export default function initEventListener(
    internalState: InternalNavigationLockState
) {
    if (internalState.destroyEventListener !== null) {
        return internalState.destroyEventListener;
    }

    const listener = (event: PopStateEvent) => {
        if (internalState.catchPopState == null) {
            return handlePopState(internalState);
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
