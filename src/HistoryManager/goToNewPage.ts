import * as URLManager from "../URLManager";

import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import addBack from "./addBack";
import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import goToHREF from "./goToHREF";
import onLanded from "./onLanded";

export default async function goToNewPage(
    internalState: InternalHistoryManagerState
) {
    const {
        contextManager,
        historyManaged,
        replacing
    } = internalState;

    const href: string = URLManager.get();
    const backHref: string = contextManager.get()!;
    if (href === backHref || !historyManaged) {
        return onLanded(internalState);
    }

    const replaced: boolean = replacing;
    internalState.replacing = false;

    const willHaveBack: boolean = internalState.hasBack || !replaced;
    contextManager.insert(href, replaced);

    if (internalState.hasBack && !replaced) {
        await awaitableOnCatchPopState(internalState, () => {
            window.history.go(-1);
        });
    }

    if (!replaced) {
        await addBack(backHref, internalState);
    }
    await awaitableOnCatchPopState(internalState, () => {
        goToHREF(href, true);
    });

    internalState.hasBack = willHaveBack;
    onLanded(internalState);
}