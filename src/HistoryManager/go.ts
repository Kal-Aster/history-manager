import awaitableOnWorkFinished from "./awaitableOnWorkFinished";
import createWork from "./createWork";
import getInternalState from "./getInternalState";
import onLanded from "./onLanded";
import tryUnlock from "./tryUnlock";

export default async function go(direction: number) {
    const locksFinished = tryUnlock();

    if (direction === 0) {
        return;
    }

    if (typeof direction !== "number") {
        direction = parseInt(direction, 10);
    }
    if (isNaN(direction)) {
        throw new Error("direction must be a number");
    }

    direction = direction + locksFinished;
    if (direction === 0) {
        return;
    }

    await awaitableOnWorkFinished();

    const internalState = getInternalState();
    if (internalState.historyManaged === false) {
        window.history.go(direction);
        return;
    }

    const contextIndex = internalState.contextManager.index();
    let index = Math.max(0, Math.min(
        internalState.contextManager.length() - 1,
        contextIndex + direction
    ));
    if (contextIndex === index) {
        onLanded();
        return;
    }

    internalState.workToRelease = createWork(false);
    const onWorkFinishedPromise = awaitableOnWorkFinished();
    if (direction > 0) {
        internalState.contextManager.index(index - 1);
        window.history.go(1);
    } else {
        internalState.contextManager.index(index + 1);
        window.history.go(-1);
    }

    await onWorkFinishedPromise;
}
