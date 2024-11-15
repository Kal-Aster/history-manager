import getInternalState from "./getInternalState";

export default function onCatchPopState(
    onCatchPopState: () => void,
    once: boolean
) {
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
