import awaitableOnWorkFinished from "./awaitableOnWorkFinished";
import createWork from "./createWork";
import getInternalState from "./getInternalState";
import goToHREF from "./goToHREF";
import tryUnlock from "./tryUnlock";

export default async function replace(href: string) {
    tryUnlock();

    await awaitableOnWorkFinished();

    const internalState = getInternalState();
    internalState.workToRelease = createWork(false);

    const onWorkFinishedPromise = awaitableOnWorkFinished();
    internalState.replacing = true;
    goToHREF(href, true);
    await onWorkFinishedPromise;
}
