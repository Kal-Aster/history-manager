import InternalHistoryManagerState from "../types/InternalHistoryManagerState";

export default function onCatchPopState(
    onCatchPopState: () => void,
    once: boolean = false,
    internalState: InternalHistoryManagerState
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