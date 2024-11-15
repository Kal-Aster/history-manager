import Location from "../types/Location";
import RouteCallback from "../types/RouteCallback";

import GenericRouter from "./GenericRouter";
import getLocation from "./getLocation";
import keyMapFromKeysAndValues from "./keyMapFromKeysAndValues";

import { REDIRECTIONS, ROUTES } from "./constants";

export default function emitSingle(
    router: GenericRouter,
    location: Location
): void {
    // se non è disponibile `location` recuperare l'attuale
    let path = location.pathname;
    // path = PathGenerator.prepare(path);
    // it is done inside location, is it needed here?
    let redirection: Parameters<RouteCallback>[2] | null = null;
    // check if this route should be redirected
    router[REDIRECTIONS].forEach(redirectionRoute => {
        const exec = redirectionRoute.regexp.exec(path);
        if (exec == null) {
            return;
        }

        redirection = {
            location: location!,
            keymap: keyMapFromKeysAndValues(
                redirectionRoute.keys,
                exec.slice(1)
            )
        };
        location = getLocation(redirectionRoute.redirection);
        path = location.pathname;
    });
    router[ROUTES].some(route => {
        const exec = route.regexp.exec(path);
        if (exec == null) {
            return false;
        }

        route.callback(
            location,
            keyMapFromKeysAndValues(route.keys, exec.slice(1)),
            redirection
        );
        return true;
    });
}