import queryString from "query-string";

import PathGenerator from "../PathGenerator";
import URLManager from "../URLManager";

import Location from "../types/Location";

export default function getLocation(
    href: string = URLManager.get()
): Location {
    let pathname: string = "";
    let hash: string = "";
    let query: string = "";
    let cachedQuery: { [key: string]: any } | null = null;
    // href = "/" + href.replace(/[\\\/]+(?![^(]*[)])/g, "/").replace(/^[\/]+/, "").replace(/[\/]+$/, "");
    {
        let split: string[] = href.split("#");
        pathname = split.shift()!;
        hash = split.join("#");
        hash = hash ? "#" + hash : "";
    }{
        let split: string[] = pathname.split("?");
        pathname = split.shift()!;
        query = split.join("?");
        query = query ? "?" + query : "";
    }
    pathname = PathGenerator.prepare(pathname);
    return {
        hrefIf: function (go: string): string {
            let oldP: string = pathname;
            let oldH: string = hash;
            let oldQ: string = query;
            this.href = go;
            let hrefIf: string = this.href;
            pathname = oldP;
            hash = oldH;
            query = oldQ;
            return hrefIf;
        },
        get href(): string {
            return pathname + query + hash;
        },
        set href(value: string) {
            if (typeof value !== "string") {
                throw new Error("href should be a string");
            }
            if (!value) {
                // refresh
                return;
            }
            // match at start "//", "/", "#" or "?"
            let match: RegExpMatchArray | null = value.match(/^([\/\\]{2,})|([\/\\]{1})|([#])|([\?])/);
            if (match) {
                switch (match[0]) {
                    case "?": {
                        query = "?" + encodeURI(value.substr(1)).replace("#", "%23").replace("?", "%3F");
                        break;
                    }
                    case "#": {
                        hash = value;
                        break;
                    }
                    case "/": {
                        pathname = PathGenerator.prepare(value);
                        hash = "";
                        query = "";
                        break;
                    }
                    default: {
                        // here only for "//", not valid
                        return;
                    }
                }
            } else {
                let path: Array<string> = pathname.split("/");
                // replace last item with the new value
                path.pop();
                path.push(PathGenerator.prepare(value));
                pathname = path.join("/");
                hash = "";
                query = "";
            }
            // emit?
        },
        get pathname(): string {
            return pathname;
        },
        set pathname(value: string) {
            if (typeof value !== "string") {
                throw new Error("pathname should be a string");
            }
            pathname = PathGenerator.prepare(value);
        },
        get hash(): string {
            return hash;
        },
        set hash(value: string) {
            if (typeof value !== "string") {
                throw new Error("hash should be a string");
            }
            if (!value) {
                hash = "";
                return;
            }
            if (value.indexOf("#") !== 0) {
                value = "#" + value;
            }
            hash = value;
        },
        get query(): string {
            return query;
        },
        set query(value: string) {
            if (typeof value !== "string") {
                throw new Error("query should be a string");
            }
            cachedQuery = null;
            if (!value) {
                query = "";
                return;
            }
            if (value.indexOf("?") !== 0) {
                value = "?" + value;
            }
            query = encodeURI(value).replace("#", "%23");
        },
        get parsedQuery(): any {
            if (!query) {
                return {};
            }
            if (!cachedQuery) {
                cachedQuery = queryString.parse(query.replace(/^\?/, ""));
            }
            return cachedQuery;
        },
        hasQueryParam(param: string): boolean {
            if (!query) {
                return false;
            }
            return this.parsedQuery[param] !== undefined;
        },
        getQueryParam(param: string): string | null | undefined {
            if (!query) {
                return undefined;
            }
            return this.parsedQuery[param];
        },
        addQueryParam(param: string, value: string | null = null): void {
            let newQuery: { [key: string]: any } = { ...this.parsedQuery, [param]: value };
            cachedQuery = null;
            query = queryString.stringify(newQuery);
            if (query) {
                query = "?" + query;
            }
        },
        removeQueryParam(param: string): void {
            if (!query) {
                return;
            }
            let parsedQuery: { [key: string]: any } = this.parsedQuery;
            delete parsedQuery[param];
            this.query = queryString.stringify(parsedQuery);
        }
    };
}
