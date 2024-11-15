import getInternalState from "./getInternalState";

import onCatchPopStatePromise from "./onCatchPopStatePromise";

export default async function unlock(force = false) {
    const wrapper = getInternalState().locks.splice(-1, 1)[0];
    if (wrapper == null) {
        return true;
    }
    if (!force && !wrapper.fire()) {
        return false;
    }

    await wrapper.beginRelease();

    const promise = onCatchPopStatePromise();
    window.history.go(-1);
    await promise;

    await wrapper.release();
    return true;
}
