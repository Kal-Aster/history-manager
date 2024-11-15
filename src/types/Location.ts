type Location = {
    href: string;

    pathname: string;

    hash: string;

    query: string;
    parsedQuery: any;

    hasQueryParam(param: string): boolean;
    getQueryParam(param: string): string | null | undefined;

    addQueryParam(param: string, value: string | null): void;
    removeQueryParam(param: string): void;

    hrefIf(go: string): string;
};
export default Location;