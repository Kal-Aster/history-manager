export declare class ContextManager {
    private _contexts;
    private _hrefs;
    private _index;
    private _length;
    /**
     * Removes all references after the actual index
     */
    clean(): void;
    currentContext(): string | null;
    contextOf(href: string, skipFallback?: boolean): string | null;
    insert(href: string, replace?: boolean): void;
    goBackward(): string;
    goForward(): string;
    get(index?: number): string | null;
    index(): number;
    index(value: number): void;
    length(): number;
    getContextNames(): string[];
    getDefaultOf(context: string): string | null;
    restore(context: string): boolean;
    addContextPath(context_name: string, path: string, fallback?: boolean): RegExp;
    setContextDefaultHref(context_name: string, href: string | null): void;
    setContext(context: {
        name: string;
        paths: {
            path: string;
            fallback?: boolean;
        }[];
        default?: string | null;
    }): void;
    hrefs(): string[];
}
export interface IContextPath {
    path: RegExp;
    fallback: boolean;
}
export type ContextInfo = [IContextPath[], string | null | undefined];
export type ContextsMap = Map<string, ContextInfo>;
export type HREFsArray = [string, string[]][];
