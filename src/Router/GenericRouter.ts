import PathGenerator from "../PathGenerator";

import RedirectionRoute from "../types/RedirectionRoute";
import Route from "../types/Route";
import RouteCallback from "../types/RouteCallback";

import emitSingle from "./emitSingle";
import getInternalState from "./getInternalState";
import getLocation from "./getLocation";
import throwIfRouterDestroyed from "./throwIfRouterDestroyed";

import {
    DESTROYED,
    REDIRECTIONS,
    ROUTES
} from "./constants";

export default class GenericRouter {
    constructor() {
        getInternalState().routers.push(this);
    }

    [ROUTES]: Array<Route> = [];
    [REDIRECTIONS]: Array<RedirectionRoute> = [];
    [DESTROYED]: boolean = false;

    destroy() {
        if (this[DESTROYED]) {
            return;
        }
        const { routers } = getInternalState();
        const index = routers.indexOf(this);
        if (index > -1) {
            routers.splice(index, 1);
        }

        this[DESTROYED] = true;
    }

    /**
     * Segna il percorso specificato come reindirizzamento ad un altro
     * @param path
     * @param redirection
     */
    redirect(path: string, redirection: string) {
        throwIfRouterDestroyed(this);

        const { regexp, keys } = PathGenerator.generate(path);
        this[REDIRECTIONS].push({
            regexp, keys,
            redirection: PathGenerator.prepare(redirection)
        });
        return regexp;
    }
    /**
     * Remvove a redirection route
     * @param path
     */
    unredirect(path: string) {
        throwIfRouterDestroyed(this);

        const { regexp } = PathGenerator.generate(path);
        const redirectionRouteIndex = this[ROUTES].findIndex(route => {
            let xSource = (regexp.ignoreCase ?
                regexp.source.toLowerCase() : regexp.source
            );
            let ySource = (route.regexp.ignoreCase ?
                route.regexp.source.toLowerCase() : route.regexp.source
            );
            return (
                (xSource === ySource) &&
                (regexp.global === route.regexp.global) &&
                (regexp.ignoreCase === route.regexp.ignoreCase) &&
                (regexp.multiline === route.regexp.multiline)
            );
        });
        if (redirectionRouteIndex < 0) {
            return;
        }

        this[ROUTES].splice(redirectionRouteIndex, 1);
    }

    /**
     * Pairs a callback with a path
     */
    route(path: string, callback: RouteCallback) {
        throwIfRouterDestroyed(this);

        const { regexp, keys } = PathGenerator.generate(path);
        this[ROUTES].push({ regexp, keys, callback });

        return regexp;
    }
    /**
     * Remove a route callback
     */
    unroute(path: string) {
        throwIfRouterDestroyed(this);

        const { regexp } = PathGenerator.generate(path);
        const rIndex = this[ROUTES].findIndex(route => {
            const xSource = (regexp.ignoreCase ?
                regexp.source.toLowerCase() : regexp.source
            );
            const ySource = (route.regexp.ignoreCase ?
                route.regexp.source.toLowerCase() : route.regexp.source
            );
            return (
                (xSource === ySource) &&
                (regexp.global === route.regexp.global) &&
                (regexp.ignoreCase === route.regexp.ignoreCase) &&
                (regexp.multiline === route.regexp.multiline)
            );
        });
        if (rIndex < 0) {
            return;
        }

        this[ROUTES].splice(rIndex, 1);
    }

    emit() {
        emitSingle(this, getLocation());
    }
}