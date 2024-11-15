import GenericRouter from "./GenericRouter";

import { DESTROYED } from "./constants";

export default function throwIfRouterDestroyed(
    router: GenericRouter
) {
    if (router[DESTROYED]) {
        throw new Error("Router destroyed");
    }
}