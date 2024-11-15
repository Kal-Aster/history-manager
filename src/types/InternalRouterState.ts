import GenericRouter from "../Router/GenericRouter";

type InternalRouterState = {
    routers: Array<GenericRouter>,
    emitRoute: boolean,
    destroyEventListener: (() => void) | null
};
export default InternalRouterState;