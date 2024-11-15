import OptionsManager from "../OptionsManager";

import getInternalState from "./getInternalState";
import handlePopState from "./handlePopState";
import isLocked from "./isLocked";

export default function initEventListener() {
    const internalState = getInternalState();

    if (internalState.destroyEventListener !== null) {
        return internalState.destroyEventListener;
    }

    const destroyOptionsEventListener = OptionsManager.initEventListener();

    const listener = (event: PopStateEvent) => {
        if (!internalState.started || isLocked()) {
            return;
        }
        const { catchPopState } = internalState;
        if (catchPopState == null) {
            handlePopState();
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