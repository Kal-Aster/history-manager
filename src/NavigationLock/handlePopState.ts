import OptionsManager from "../OptionsManager";

import getInternalState from "./getInternalState";
import unlock from "./unlock";

export default function handlePopState() {
    const internalState = getInternalState();

    if (internalState.locks.length === 0) {
        return;
    }
    const lockId = parseInt(OptionsManager.get().locked, 10);
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
        internalState.shouldUnlock = true;
    }
    window.history.go(-1);
}