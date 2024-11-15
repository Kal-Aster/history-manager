import InternalHistoryManagerState from "../types/InternalHistoryManagerState";

import ContextManager from "../ContextManager";

const internalState: InternalHistoryManagerState = {
    started: false,
    historyManaged: null,

    works: [],
    onworkfinished: [],
    workToRelease: null,

    contextManager: new ContextManager(),

    hasBack: false,
    replacing: false,

    catchPopState: null,
    destroyEventListener: null
};
export default function getInternalState() {
    return internalState;
}