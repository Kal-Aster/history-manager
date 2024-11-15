import HistoryManager from "../HistoryManager";
import OptionsManager from "../OptionsManager";

import createLockManagerWrapper from "./createLockManagerWrapper";

export default async function lock() {
    await HistoryManager.onWorkFinishedPromise();

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
