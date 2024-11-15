import emitSingle from "./emitSingle";
import getInternalState from "./getInternalState";
import getLocation from "./getLocation";

export default function emit() {
    const location = getLocation();
    getInternalState().routers.forEach(router => {
        emitSingle(router, location);
    });
}