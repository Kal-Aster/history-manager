import InternalHistoryManagerState from "../types/InternalHistoryManagerState";

import onWorkFinished from "./onWorkFinished";

export default async function awaitableOnWorkFinished() {
    return new Promise<void>(resolve => {
        onWorkFinished(resolve, null);
    });
}