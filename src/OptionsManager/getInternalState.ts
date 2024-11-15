import InternalOptionsManagerState from "../types/InternalOptionsManagerState";

const internalState: InternalOptionsManagerState = {
    DIVIDER: "#R!:",
    catchPopState: null,
    destroyEventListener: null
}
export default function getInternalState() {
    return internalState;
}