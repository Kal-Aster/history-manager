import getInternalState from "./getInternalState";

export default function onCatchPopState(
    onCatchPopState: () => void,
    once: boolean
): void {
    const internalState = getInternalState();

    if (once) {
        // Queued rather than assigned to a single slot: a second self-induced
        // popstate registered before the first one arrives must not clobber
        // it (see the queue's comment in InternalNavigationLockState).
        internalState.catchPopStateQueue.push(onCatchPopState);
        return;
    }

    internalState.catchPopState = onCatchPopState;
}
