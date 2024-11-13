import InternalNavigationLockState from "../types/InternalNavigationLockState";

export default function onCatchPopState(
    onCatchPopState: () => void,
    once: boolean,
    internalState: InternalNavigationLockState
): void {
    if (once) {
        const tmpOnCatchPopState: () => void = onCatchPopState;
        onCatchPopState = () => {
            internalState.catchPopState = null;
            tmpOnCatchPopState();
        };
    }

    internalState.catchPopState = onCatchPopState;
}
