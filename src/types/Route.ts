import { Key } from "path-to-regexp";

import RouteCallback from "./RouteCallback";

type Route = {
    regexp: RegExp;
    keys: Array<Key>;
    callback: RouteCallback;
};
export default Route;