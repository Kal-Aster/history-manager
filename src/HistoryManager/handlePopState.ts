import * as OptionsManager from "../OptionsManager";

import InternalHistoryManagerState from "../types/InternalHistoryManagerState";
import goBackward from "./goBackward";
import goForward from "./goForward";
import goToNewPage from "./goToNewPage";
import onCatchPopState from "./onCatchPopState";

export default function handlePopState(
    internalState: InternalHistoryManagerState
): void {
    let options: OptionsManager.Options = {
        ...OptionsManager.get(),
        ...(internalState.historyManaged ?
            {} : { front: undefined, back: undefined }
        )
    };
    if (options.locked) {
        onCatchPopState(() => {
            if (OptionsManager.get().locked) {
                handlePopState(internalState);
            }
        }, true, internalState);
        window.history.go(-1);
        return;
    }

    if (options.front !== undefined) {
        const frontEvent: Event = new Event(
            "historyforward", { cancelable: true }
        );
        window.dispatchEvent(frontEvent);
        if (frontEvent.defaultPrevented) {
            onCatchPopState(() => { return; }, true, internalState);
            window.history.go(-1);
            return;
        }

        goForward(internalState);
        return;
    }
    
    if (options.back !== undefined) {
        let backEvent: Event = new Event(
            "historybackward", { cancelable: true }
        );
        window.dispatchEvent(backEvent);
        if (backEvent.defaultPrevented) {
            onCatchPopState(() => { return; }, true, internalState);
            window.history.go(+1);
            return;
        }
 
        goBackward(internalState);
        return;
    }

    goToNewPage(internalState);
}