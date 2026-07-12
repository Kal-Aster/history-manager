import OptionsManager from "../OptionsManager";

import getInternalState from "./getInternalState";

/**
 * Whether a popstate should be treated as lock-related: either there is a live
 * in-memory lock, or the URL still carries a `locked` marker (e.g. a stale
 * marker with no live lock). The orchestrator uses this to route the event to
 * `handlePopState()` instead of the normal navigation handler.
 */
export default function hasLockSignal(): boolean {
    return (
        getInternalState().locks.length > 0 ||
        !!OptionsManager.get().locked
    );
}
