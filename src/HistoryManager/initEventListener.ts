import OptionsManager from "../OptionsManager";

import InternalHistoryManagerState from "../types/InternalHistoryManagerState";

import handlePopState from "./handlePopState";
import isLocked from "./isLocked";

export default function initEventListener(
    internalState: InternalHistoryManagerState
) {
    if (internalState.destroyEventListener !== null) {
        return internalState.destroyEventListener;
    }

    const destroyOptionsEventListener = OptionsManager.initEventListener();

    const listener = (event: PopStateEvent) => {
        if (!internalState.started || isLocked(internalState)) {
            return;
        }
        const { catchPopState } = internalState;
        if (catchPopState == null) {
            handlePopState(internalState);
            return;
        }
        event.stopImmediatePropagation();
        catchPopState();
    };
    window.addEventListener("popstate", listener, true);
    return internalState.destroyEventListener = () => {
        window.removeEventListener("popstate", listener, true);
        destroyOptionsEventListener();
        internalState.destroyEventListener = null;
    };
}