import InternalRouterState from "../types/InternalRouterState";

const internalState: InternalRouterState = {
    routers: [],
    emitRoute: true,
    destroyEventListener: null
};

export default function getInternalState() {
    return internalState;
}