import { ContextManager } from "../ContextManager";
import Work from "./Work";
type InternalHistoryManagerState = {
    started: boolean;
    historyManaged: boolean | null;
    works: Array<Work>;
    onworkfinished: Array<[() => void, any]>;
    workToRelease: Work | null;
    contextManager: ContextManager;
    hasBack: boolean;
    replacing: boolean;
    catchPopState: (() => void) | null;
    destroyEventListener: (() => void) | null;
};
export default InternalHistoryManagerState;
