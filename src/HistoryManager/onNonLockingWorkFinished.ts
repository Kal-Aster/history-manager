import getInternalState from "./getInternalState";

/**
 * Like onWorkFinished, but only waits for navigation to settle: held locks
 * (their persistent LockingWork) are ignored. Resolves as soon as no
 * non-locking work is pending, so acquiring a lock never blocks on another
 * lock already being held.
 */
export default function onNonLockingWorkFinished<T>(
    callback: (this: T) => void, context: T
): void {
    const internalState = getInternalState();
    if (!internalState.works.some(w => !w.locking)) {
        callback.call(context || null as any);
        return;
    }
    internalState.onnonlockingworkfinished.push(
        [callback, context || null]
    );
}
