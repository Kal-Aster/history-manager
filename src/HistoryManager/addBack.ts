import * as URLManager from "../URLManager";
import * as OptionsManager from "../OptionsManager";

import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import Work from "../types/Work";
import awaitableCatchPopState from "./awaitableCatchPopState";
import createWork from "./createWork";
import goToHREF from "./goToHREF";

export default async function addBack(
    backHref: string,
    internalState: InternalHistoryManagerState
) {
    const href: string = URLManager.get();
    const work: Work = createWork(false, internalState);

    await awaitableCatchPopState(internalState, () => {
        window.history.go(-1);
    });

    if (backHref) {
        await awaitableCatchPopState(internalState, () => {
            goToHREF(backHref, true);
        });
    }

    await OptionsManager.set({ back: null, front: undefined });

    await awaitableCatchPopState(internalState, () => {
        goToHREF(href);
    });

    work.finish();
}