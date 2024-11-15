import addBack from "./addBack";
import addFront from "./addFront";
import awaitableOnCatchPopState from "./awaitableOnCatchPopState";
import getInternalState from "./getInternalState";
import goToHREF from "./goToHREF";
import onLanded from "./onLanded";

export default async function goForward() {
    const internalState = getInternalState();
    const { contextManager } = internalState;

    const backHref: string = contextManager.get()!;
    const href: string = contextManager.goForward();
    if (internalState.hasBack) {
        await awaitableOnCatchPopState(() => {
            window.history.go(-1);
        });
    }

    await awaitableOnCatchPopState(() => {
        goToHREF(href, true);
    });

    await addBack(backHref);

    if (contextManager.index() < contextManager.length() - 1) {
        await addFront(
            contextManager.get(contextManager.index() + 1)!
        );
        // await awaitableCatchPopState(() => {
        //     addFront(
        //         contextManager.get(contextManager.index() + 1)!
        //     );
        // });
    }

    internalState.hasBack = true;
    onLanded();
}