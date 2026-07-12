import OptionsManager from "../OptionsManager";

import getInternalState from "./getInternalState";
import onCatchPopState from "./onCatchPopState";
import unlock from "./unlock";

export default function handlePopState() {
    const internalState = getInternalState();

    const rawLocked = OptionsManager.get().locked;

    if (internalState.locks.length === 0) {
        // No live lock. Previously HistoryManager handled this case: a stale
        // `locked` marker in the URL with no lock object behind it. Pin the
        // user back until the marker is gone.
        if (rawLocked == null) {
            return;
        }
        onCatchPopState(() => {
            if (OptionsManager.get().locked) {
                handlePopState();
            }
        }, true);
        window.history.go(-1);
        return;
    }

    const lockId = parseInt(rawLocked, 10);
    if (isNaN(lockId)) {
        internalState.shouldUnlock = true;
        window.history.go(1);
        return;
    }

    const lock = internalState.locks.at(-1)!;
    if (lockId === lock.lockManager.id) {
        if (internalState.shouldUnlock && lock.fire()) {
            unlock(true);
        }
        internalState.shouldUnlock = false;
        return;
    }

    if (lockId <= lock.lockManager.id) {
        // Landed on a *lower* stacked lock's entry: a back press moved us off
        // the top lock. Re-trap forward to the top lock's entry so the release
        // decision is always taken there (same as the NaN/pre-lock branch
        // above), and mark that the user attempted to leave. Going further back
        // here would ping-pong forever between the pre-lock entry and this one.
        internalState.shouldUnlock = true;
        window.history.go(1);
        return;
    }

    window.history.go(-1);
}
