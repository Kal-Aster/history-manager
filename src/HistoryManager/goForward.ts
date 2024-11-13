import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import addBack from "./addBack";
import addFront from "./addFront";
import awaitableCatchPopState from "./awaitableCatchPopState";
import goToHREF from "./goToHREF";
import onLanded from "./onLanded";

export default async function goForward(
    internalState: InternalHistoryManagerState
) {
    const { contextManager } = internalState;

    const backHref: string = contextManager.get()!;
    const href: string = contextManager.goForward();
    if (internalState.hasBack) {
        await awaitableCatchPopState(internalState, () => {
            window.history.go(-1);
        });
    }

    await awaitableCatchPopState(internalState, () => {
        goToHREF(href, true);
    });

    await addBack(backHref, internalState);

    if (contextManager.index() < contextManager.length() - 1) {
        await addFront(
            contextManager.get(contextManager.index() + 1)!,
            internalState
        );
        // await awaitableCatchPopState(internalState, () => {
        //     addFront(
        //         contextManager.get(contextManager.index() + 1)!,
        //         internalState
        //     );
        // });
    }

    internalState.hasBack = true;
    onLanded(internalState);
}