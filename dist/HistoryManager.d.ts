/**
 * @author Giuliano Collacchioni @2020
 */
import LockingWork from "./types/LockingWork";
declare function setAutoManagement(value: boolean): void;
declare function getAutoManagement(): boolean;
declare function onWorkFinished<T>(callback: (this: T) => void, context?: T): void;
declare function acquire(): LockingWork;
declare function index(): number;
declare function getHREFAt(index: number): string | null;
declare function setContext(context: {
    name: string;
    paths: {
        path: string;
        fallback?: boolean;
    }[];
    default?: string | null;
}): void;
declare function addContextPath(context: string, href: string, isFallback?: boolean): RegExp;
declare function setContextDefaultHref(context: string, href: string): void;
declare function getContextDefaultOf(context: string): string | null;
declare function getContext(href?: string | null): string | null;
declare function getHREFs(): string[];
declare function restore(context: string): Promise<void>;
declare function assign(href: string): Promise<void>;
declare function replace(href: string): Promise<void>;
declare function go(direction: number): Promise<void>;
declare function start(fallbackContext: string | null): Promise<void>;
declare function isStarted(): boolean;
declare const historyManager: {
    setAutoManagement: typeof setAutoManagement;
    getAutoManagement: typeof getAutoManagement;
    onWorkFinished: typeof onWorkFinished;
    acquire: typeof acquire;
    initEventListener(): () => void;
    index: typeof index;
    getHREFAt: typeof getHREFAt;
    setContext: typeof setContext;
    addContextPath: typeof addContextPath;
    setContextDefaultHref: typeof setContextDefaultHref;
    getContextDefaultOf: typeof getContextDefaultOf;
    getContext: typeof getContext;
    getHREFs: typeof getHREFs;
    restore: typeof restore;
    assign: typeof assign;
    replace: typeof replace;
    go: typeof go;
    start: typeof start;
    isStarted: typeof isStarted;
};
export default historyManager;
