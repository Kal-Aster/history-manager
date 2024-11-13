import * as URLManager from "../URLManager";
import * as OptionsManager from "../OptionsManager";

import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import Work from "../types/Work";
import createWork from "./createWork";
import awaitableCatchPopState from "./awaitableCatchPopState";
import goToHREF from "./goToHREF";

export default async function addFront(
    frontHref: string,
    internalState: InternalHistoryManagerState
): Promise<void> {
    const href: string = URLManager.get();
    const work: Work = createWork(false, internalState);

    await OptionsManager.goWith(
        URLManager.construct(frontHref, true),
        { back: undefined, front: null }
    );

    await awaitableCatchPopState(internalState, () => {
        window.history.go(-1);
    });

    await awaitableCatchPopState(internalState, () => {
        goToHREF(href, true);
    });

    work.finish();
}