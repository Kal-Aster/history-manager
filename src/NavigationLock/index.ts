/**
 * @author Giuliano Collacchioni @2020
 */

import getInternalState from "./getInternalState";
import initEventListener from "./initEventListener";
import lock from "./lock";
import unlock from "./unlock";

function locked(): boolean {
    return getInternalState().locks.length > 0;
}

const NavigationLock = {
    initEventListener,
    lock,
    locked,
    unlock
};
export default NavigationLock;