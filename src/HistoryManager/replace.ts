import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import awaitableOnWorkFinished from "./awaitableOnWorkFinished";
import createWork from "./createWork";
import goToHREF from "./goToHREF";

import tryUnlock from "./tryUnlock";

export default async function replace(
    href: string,
    internalState: InternalHistoryManagerState
) {
    tryUnlock(internalState);

    await awaitableOnWorkFinished(internalState);

    internalState.workToRelease = createWork(false, internalState);

    const onWorkFinishedPromise = awaitableOnWorkFinished(internalState);
    internalState.replacing = true;
    goToHREF(href, true);

    await onWorkFinishedPromise;
}
