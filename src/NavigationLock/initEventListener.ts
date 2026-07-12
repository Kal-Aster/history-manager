import getInternalState from "./getInternalState";

export default function initEventListener() {
    const internalState = getInternalState();
    if (internalState.destroyEventListener !== null) {
        return internalState.destroyEventListener;
    }

    // The popstate listener now lives in the single Router orchestrator, which
    // drives this module via `resumeIfWaiting()` / `handlePopState()`.
    return internalState.destroyEventListener = () => {
        internalState.destroyEventListener = null;
    };
}
