import { Key } from "path-to-regexp";

type RedirectionRoute = {
    regexp: RegExp;
    keys: Array<Key>;
    redirection: string;
};
export default RedirectionRoute;