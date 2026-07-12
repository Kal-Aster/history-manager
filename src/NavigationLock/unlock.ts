import getInternalState from "./getInternalState";

import onCatchPopStatePromise from "./onCatchPopStatePromise";

export default async function unlock(force = false) {
    const { locks } = getInternalState();

    // Detach the top lock while we decide: keeps the fire() dispatch below
    // seeing the same registry state as before (a fired listener that re-enters
    // the lock system must not find this lock still present).
    const index = locks.length - 1;
    const wrapper = locks.splice(index, 1)[0];
    if (wrapper == null) {
        return true;
    }
    if (!force && !wrapper.fire()) {
        // Release refused: restore the lock at its original position (a listener
        // fired above may have pushed another lock in the meantime). Dropping it
        // would orphan its work and strand the `locked` marker in the URL.
        locks.splice(index, 0, wrapper);
        return false;
    }

    await wrapper.beginRelease();

    const promise = onCatchPopStatePromise();
    window.history.go(-1);
    await promise;

    await wrapper.release();
    return true;
}
