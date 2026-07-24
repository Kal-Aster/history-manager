import getInternalState from "./getInternalState";

/**
 * If this module is waiting for a self-induced popstate (a pending one-shot
 * continuation), deliver it now and report that the event was consumed.
 * Called by the single popstate orchestrator, not registered as a listener.
 */
export default function resumeIfWaiting(): boolean {
    const internalState = getInternalState();

    const next = internalState.catchPopStateQueue.shift();
    if (next != null) {
        next();
        return true;
    }

    if (internalState.catchPopState == null) {
        return false;
    }
    internalState.catchPopState();
    return true;
}
