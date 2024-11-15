import HistoryManager from "../HistoryManager";
import NavigationLock from "../NavigationLock";

import getInternalState from "./getInternalState";
import onhistorylanded from "./onhistorylanded";

export default function initEventListener() {
    const state = getInternalState();

    if (state.destroyEventListener !== null) {
        return state.destroyEventListener;
    }

    const destroyHistoryEventListener = HistoryManager.initEventListener();
    const destroyNavigationLockEventListener = NavigationLock.initEventListener();

    window.addEventListener("historylanded", onhistorylanded);
    return state.destroyEventListener = () => {
        window.removeEventListener("historylanded", onhistorylanded);
        destroyNavigationLockEventListener();
        destroyHistoryEventListener();
        state.destroyEventListener = null;
    };
}
