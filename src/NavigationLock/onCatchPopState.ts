import getInternalState from "./getInternalState";

export default function onCatchPopState(
    onCatchPopState: () => void,
    once: boolean
): void {
    const internalState = getInternalState();

    if (once) {
        const tmpOnCatchPopState: () => void = onCatchPopState;
        onCatchPopState = () => {
            internalState.catchPopState = null;
            tmpOnCatchPopState();
        };
    }

    internalState.catchPopState = onCatchPopState;
}
