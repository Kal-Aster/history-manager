import URLManager from "../URLManager";

import addBack from "./addBack";
import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import getInternalState from "./getInternalState";
import goToHREF from "./goToHREF";
import onLanded from "./onLanded";

export default async function goToNewPage() {
    const internalState = getInternalState();
    const {
        contextManager,
        historyManaged,
        replacing
    } = internalState;

    const href: string = URLManager.get();
    const backHref: string = contextManager.get()!;
    if (href === backHref || !historyManaged) {
        return onLanded();
    }

    const replaced: boolean = replacing;
    internalState.replacing = false;

    const willHaveBack: boolean = internalState.hasBack || !replaced;
    contextManager.insert(href, replaced);

    if (internalState.hasBack && !replaced) {
        await awaitableOnCatchPopState(() => {
            window.history.go(-1);
        });
    }

    if (!replaced) {
        await addBack(backHref);
    }
    await awaitableOnCatchPopState(() => {
        goToHREF(href, true);
    });

    internalState.hasBack = willHaveBack;
    onLanded();
}