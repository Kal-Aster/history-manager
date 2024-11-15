import InternalNavigationLockState from "../types/InternalNavigationLockState";

const internalState: InternalNavigationLockState = {
    locks: [],

    shouldUnlock: false,

    catchPopState: null,
    destroyEventListener: null
};
export default function getInternalState() {
    return internalState;
}