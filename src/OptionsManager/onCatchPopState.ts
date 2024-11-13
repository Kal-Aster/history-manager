import InternalOptionsManagerState from "../types/InternalOptionsManagerState";

export default function onCatchPopState(
    onCatchPopState: () => void,
    once: boolean,
    internalState: InternalOptionsManagerState
) {
    if (once) {
        const tmpOnCatchPopState: () => void = onCatchPopState;
        onCatchPopState = () => {
            internalState.catchPopState = null;
            tmpOnCatchPopState();
        };
    }

    internalState.catchPopState = onCatchPopState;
}
