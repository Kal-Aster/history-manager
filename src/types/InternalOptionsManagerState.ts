type InternalOptionsManagerState = {
    DIVIDER: string,

    catchPopState: (() => void) | null,
    destroyEventListener: (() => void) | null
};
export default InternalOptionsManagerState;