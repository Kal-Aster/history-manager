import awaitableOnWorkFinished from "./awaitableOnWorkFinished";
import createWork from "./createWork";
import getInternalState from "./getInternalState";
import goToHREF from "./goToHREF";
import tryUnlock from "./tryUnlock";

export default async function assign(href: string) {
    tryUnlock();

    await awaitableOnWorkFinished();
    getInternalState().workToRelease = createWork(false);

    const onWorkFinishedPromise = awaitableOnWorkFinished();

    goToHREF(href);

    await onWorkFinishedPromise;
}