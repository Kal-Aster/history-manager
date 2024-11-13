import * as URLManager from "../URLManager";

import OptionsManager from "../OptionsManager";

import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import Work from "../types/Work";

import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import createWork from "./createWork";
import goToHREF from "./goToHREF";

export default async function addBack(
    backHref: string,
    internalState: InternalHistoryManagerState
) {
    const href: string = URLManager.get();
    const work: Work = createWork(false, internalState);

    await awaitableOnCatchPopState(internalState, () => {
        window.history.go(-1);
    });

    if (backHref) {
        await awaitableOnCatchPopState(internalState, () => {
            goToHREF(backHref, true);
        });
    }

    await OptionsManager.set({ back: null, front: undefined });

    await awaitableOnCatchPopState(internalState, () => {
        goToHREF(href);
    });

    work.finish();
}