import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import awaitableOnWorkFinished from "./awaitableOnWorkFinished";
import createWork from "./createWork";
import onLanded from "./onLanded";
import tryUnlock from "./tryUnlock";

export default async function go(
    direction: number,
    internalState: InternalHistoryManagerState
) {
    const locksFinished = tryUnlock(internalState);

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

    await awaitableOnWorkFinished(internalState);

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
        onLanded(internalState);
        return;
    }

    internalState.workToRelease = createWork(false, internalState);
    const onWorkFinishedPromise = awaitableOnWorkFinished(internalState);
    if (direction > 0) {
        internalState.contextManager.index(index - 1);
        window.history.go(1);
    } else {
        internalState.contextManager.index(index + 1);
        window.history.go(-1);
    }

    await onWorkFinishedPromise;
}
