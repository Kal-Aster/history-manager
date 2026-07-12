/**
 * @author Giuliano Collacchioni @2020
 */

import getInternalState from "./getInternalState";
import handlePopState from "./handlePopState";
import hasLockSignal from "./hasLockSignal";
import initEventListener from "./initEventListener";
import lock from "./lock";
import resumeIfWaiting from "./resumeIfWaiting";
import unlock from "./unlock";

function locked(): boolean {
    return getInternalState().locks.length > 0;
}

const NavigationLock = {
    initEventListener,
    resumeIfWaiting,
    hasLockSignal,
    handlePopState,
    lock,
    locked,
    unlock
};
export default NavigationLock;
