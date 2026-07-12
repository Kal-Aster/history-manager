import HistoryManager from "../HistoryManager";
import OptionsManager from "../OptionsManager";

import createLockManagerWrapper from "./createLockManagerWrapper";

export default async function lock() {
    // Wait for in-flight navigation to settle, but NOT for other held locks:
    // their persistent work would otherwise block stacking a second lock.
    await HistoryManager.onNonLockingWorkFinishedPromise();

    let markSetupDone: () => void;
    const setupDonePromise = new Promise<void>(resolve => {
        markSetupDone = resolve;
    });
    const lock = createLockManagerWrapper(setupDonePromise);

    await OptionsManager.goWith(
        OptionsManager.clearHref(),
        {
            ...OptionsManager.get(),
            locked: lock.lockManager.id
        }
    )

    markSetupDone!();
    return lock.lockManager;
}
