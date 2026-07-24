import LockManagerWrapper from "./LockManagerWrapper";

type InternalNavigationLockState = {
    locks: Array<LockManagerWrapper>,

    shouldUnlock: boolean,

    // One-shot catchers (`once: true`), matched in call order: two stacked
    // locks releasing in the same tick each issue their own self-induced
    // history.go(-1), and the resulting popstates must resolve their own
    // registration rather than the second clobbering the first's.
    catchPopStateQueue: Array<() => void>,
    // A persistent catcher (`once: false`) stays registered across calls.
    catchPopState: (() => void) | null,
    destroyEventListener: (() => void) | null
}
export default InternalNavigationLockState;