import OptionsManager from "../OptionsManager";
import URLManager from "../URLManager";

import Work from "../types/Work";

import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import createWork from "./createWork";
import goToHREF from "./goToHREF";

export default async function addBack(backHref: string) {
    const href: string = URLManager.get();
    const work: Work = createWork(false);

    await awaitableOnCatchPopState(() => {
        window.history.go(-1);
    });

    if (backHref) {
        await awaitableOnCatchPopState(() => {
            goToHREF(backHref, true);
        });
    }

    await OptionsManager.set({ back: null, front: undefined });

    await awaitableOnCatchPopState(() => {
        goToHREF(href);
    });

    work.finish();
}