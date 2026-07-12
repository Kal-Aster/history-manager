import get from "./get";
import getInternalState from "./getInternalState";
import set from "./set";

export default function initEventListener() {
    const internalState = getInternalState();

    if (internalState.destroyEventListener !== null) {
        return internalState.destroyEventListener;
    }

    // The popstate handling now lives in the single Router orchestrator, which
    // calls `resumeIfWaiting()`. Here we only keep the one-shot side effect:
    // remove options of the just loaded page.
    if (Object.keys(get()).length > 0) {
        set({});
    }

    return internalState.destroyEventListener = () => {
        internalState.destroyEventListener = null;
    };
}
