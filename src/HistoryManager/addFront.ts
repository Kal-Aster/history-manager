import OptionsManager from "../OptionsManager";
import URLManager from "../URLManager";

import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import Work from "../types/Work";

import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import createWork from "./createWork";
import goToHREF from "./goToHREF";

export default async function addFront(frontHref: string) {
    const href: string = URLManager.get();
    const work: Work = createWork(false);

    await OptionsManager.goWith(
        URLManager.construct(frontHref, true),
        { back: undefined, front: null }
    );

    await awaitableOnCatchPopState(() => {
        window.history.go(-1);
    });

    await awaitableOnCatchPopState(() => {
        goToHREF(href, true);
    });

    work.finish();
}