import OptionsManager from "../OptionsManager";

import getInternalState from "./getInternalState";

export default function initEventListener() {
    const internalState = getInternalState();

    if (internalState.destroyEventListener !== null) {
        return internalState.destroyEventListener;
    }

    // The popstate listener now lives in the single Router orchestrator, which
    // drives this module via `resumeIfWaiting()` / `handlePopState()`. We still
    // set up OptionsManager (one-shot load cleanup).
    const destroyOptionsEventListener = OptionsManager.initEventListener();

    return internalState.destroyEventListener = () => {
        destroyOptionsEventListener();
        internalState.destroyEventListener = null;
    };
}
