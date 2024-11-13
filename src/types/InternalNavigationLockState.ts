import LockManagerWrapper from "./LockManagerWrapper";

type InternalNavigationLockState = {
    locks: Array<LockManagerWrapper>,

    shouldUnlock: boolean,

    catchPopState: (() => void) | null,
    destroyEventListener: (() => void) | null
}
export default InternalNavigationLockState;