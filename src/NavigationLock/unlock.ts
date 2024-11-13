import InternalNavigationLockState from "../types/InternalNavigationLockState";
import onCatchPopState from "./onCatchPopState";
import onCatchPopStatePromise from "./onCatchPopStatePromise";

export default async function unlock(
    force: boolean,
    internalState: InternalNavigationLockState
) {
    const wrapper = internalState.locks.splice(-1, 1)[0];
    if (wrapper == null) {
        return true;
    }
    if (!force && !wrapper.fire()) {
        return false;
    }

    await wrapper.beginRelease();

    const promise = onCatchPopStatePromise(internalState);
    window.history.go(-1);
    await promise;

    await wrapper.release();
    return true;
}
