/**
 * @author Giuliano Collacchioni @2020
 */

import InternalNavigationLockState from "../types/InternalNavigationLockState";

import initEventListener from "./initEventListener";
import lock from "./lock";
import unlock from "./unlock";

const internalState: InternalNavigationLockState = {
    locks: [],

    shouldUnlock: false,

    catchPopState: null,
    destroyEventListener: null
};

function locked(): boolean {
    return internalState.locks.length > 0;
}

const NavigationLock = {
    initEventListener() {
        return initEventListener(internalState);
    },
    lock() {
        return lock(internalState);
    },
    locked,
    unlock(force: boolean = false) {
        return unlock(force, internalState);
    }
};
export default NavigationLock;