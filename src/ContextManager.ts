import PathGenerator from "./PathGenerator";

namespace ContextManager {
    export interface IContextPath {
        path: RegExp;
        fallback: boolean;
    }
    
    // [ paths, default_href ]
    export type ContextInfo = [ IContextPath[], string | null | undefined ];
    
    // ( context_name, ContextInfo )
    export type ContextsMap = Map<string, ContextInfo>;
    
    // [ context_name, hrefs ][]
    export type HREFsArray = [ string, string[] ][];
}
export default class ContextManager {
    private _contextInfos: ContextManager.ContextsMap = new Map();
    private _contextHrefsPairs: ContextManager.HREFsArray = [];
    private _index: number = -1;
    private _length: number = 0;
    /**
     * Removes all references after the actual index
     */
    clean() {
        if (this._index < this._length - 1) {
            let index = this._index;
            const newHREFs: ContextManager.HREFsArray = [];
            this._contextHrefsPairs.some(c_hrefs => {
                let newCHrefs: string[] = [];
                let result: boolean = c_hrefs[1].some(href => {
                    // if index is still greater or equal to 0
                    // then keep the reference else stop the loop
                    if (index-- >= 0) {
                        newCHrefs.push(href);
                        return false;
                    }
                    return true;
                });
                if (newCHrefs.length) {
                    newHREFs.push([c_hrefs[0], newCHrefs]);
                }
                return result;
            });
            this._contextHrefsPairs = newHREFs;
            this._length = this._index + 1;
        }
    }
    currentContext() {
        if (this._contextHrefsPairs.length === 0) {
            return null;
        }
        let index = this._index;
        let context: string;
        if (this._contextHrefsPairs.some(([c, hrefs]) => {
            context = c;
            index -= hrefs.length;
            return index < 0;
        })) {
            return context!;
        }
        return null;
    }
    contextOf(href: string, skipFallback: boolean = true) {
        let foundContext: string | null = null;
        href = href.split("#")[0].split("?")[0];
        for (let [context, [hrefs]] of this._contextInfos.entries()) {
            if (hrefs.some(c_href => {
                if (c_href!.fallback && skipFallback) {
                    return false;
                }
                return c_href.path.test(href);
            })) {
                foundContext = context;
                break;
            }
        }
        return foundContext;
    }
    insert(href: string, replace: boolean = false) {
        href = PathGenerator.prepare(href);
        this.clean();
        // console.group(`ContextManager.insert("${href}", ${replace})`);
        // console.log(`current href: ${this.hrefs()}`);
        // get context of href
        const foundContext = this.contextOf(href, this._length > 0);
        // console.log(`found context: ${foundContext}`);
        const previousContextHrefsPair = (
            (this._contextHrefsPairs.length > 0 ?
                this._contextHrefsPairs.at(-1)! : null
            )
        );
        if (foundContext == null) {
            if (this._contextHrefsPairs.length > 0) {
                this._contextHrefsPairs[this._contextHrefsPairs.length - 1][1].push(href);
                this._length++;
                this._index++;
            }
        } else {
            let i = -1;
            if (this._contextHrefsPairs.some((c_hrefs, index) => {
                if (c_hrefs[0] === foundContext) {
                    i = index;
                    return true;
                }
                return false;
            })) {
                const c_hrefs = this._contextHrefsPairs.splice(i, 1)[0];
                const [, hrefs] = c_hrefs;
                if (href !== hrefs[hrefs.length - 1]) {
                    hrefs.push(href);
                    this._length++;
                    this._index++;
                }
                this._contextHrefsPairs.push(c_hrefs);
            } else {
                this._contextHrefsPairs.push([foundContext, [href]]);
                this._length++;
                this._index++;
            }
        }
        if (replace && this._contextHrefsPairs.length > 0) {
            const lastContextHrefPair = this._contextHrefsPairs.at(-1)!;
            // console.log("replacing");
            if (previousContextHrefsPair != null) {
                // console.log(`last context: ["${ previousContext[0] }", [${ previousContext[1] }] ]`);
            } else {
                // console.log("last context: null");
            }
            // console.log(`current context: ["${ lastContext[0] }", [${ lastContext[1] }]]`);
            if (lastContextHrefPair === previousContextHrefsPair) {
                if (lastContextHrefPair[1].length > 1) {
                    do {
                        lastContextHrefPair[1].splice(-2, 1);
                        this._length--;
                        this._index--;
                    } while (
                        lastContextHrefPair[1].length > 1 &&
                        lastContextHrefPair[1][lastContextHrefPair[1].length - 2] === href
                    );
                    // console.log(`final hrefs: ${ lastContext[1] }`);
                }
            } else if (previousContextHrefsPair != null) {
                previousContextHrefsPair[1].splice(-1, 1);
                this._length--;
                this._index--;
            }
        }
        // console.groupEnd();
    }
    goBackward() {
        // console.group("ContextManager.goBackward()");
        // console.log(`current index: ${this._index}`);
        this._index = Math.max(--this._index, 0);
        // console.log(`new index: ${this._index}`);
        // console.groupEnd();
        return this.get()!;
    }
    goForward() {
        // console.group("ContextManager.goForward()");
        // console.log(`current index: ${this._index}`);
        this._index = Math.min(++this._index, this._length - 1);
        // console.log(`new index: ${this._index}`);
        // console.groupEnd();
        return this.get()!;
    }
    get(index: number = this._index) {
        let href: string;
        if (this._contextHrefsPairs.some(([, hrefs]) => {
            const { length } = hrefs;
            if (index >= length) {
                index -= length;
                return false;
            }
            href = hrefs[index];
            return true;
        })) {
            return href!;
        }
        return null;
    }
    index(): number;
    index(value: number): void;
    index(value?: number) {
        if (value == null) {
            return this._index;
        }
        if (typeof value !== "number") {
            value = parseInt(value, 10);
        }
        if (isNaN(value)) {
            throw new Error("value must be a number");
        }
        // console.group(`ContextManager.index(${value})`);
        // console.log(`current hrefs: ${this.hrefs()}`);
        this._index = value;
        // console.groupEnd();
    }
    length() {
        return this._length;
    }
    getContextNames() {
        return Array.from(this._contextInfos.keys());
    }
    getDefaultOf(context: string) {
        const contextInfo = this._contextInfos.get(context);
        if (contextInfo == null) {
            return null;
        }
        const [,defaultHref] = contextInfo;
        if (defaultHref == null) {
            return null;
        }
        return defaultHref;
    }
    restore(context: string) {
        const tempContextHrefsPairs = this._contextHrefsPairs;
        this.clean();
        if (this._contextHrefsPairs.length > 0) {
            const [
                lastContext,
                lastHrefs
            ] = this._contextHrefsPairs.at(-1)!;
            if (lastContext === context) {
                const path = (
                    this._contextInfos.get(context)![1] ||
                    lastHrefs[0]
                );
                const { length: numPages } = lastHrefs.splice(1);
                this._length -= numPages;
                this._index -= numPages;
                lastHrefs[0] = path;
                return true;
            }
        }
        if (!this._contextHrefsPairs.some(
            (contextHrefsPair, index, { length }) => {
                if (contextHrefsPair[0] !== context) {
                    return false;
                }

                if (index < length - 1) {
                    this._contextHrefsPairs.splice(index, 1);
                    this._contextHrefsPairs.push(contextHrefsPair);
                }
                return true;
            }
        )) {
            const contextInfo = this._contextInfos.get(context);
            if (contextInfo == null) {
                this._contextHrefsPairs = tempContextHrefsPairs;
                return false;
            }
            const [,href] = contextInfo;
            if (href != null) {
                this.insert(href);
                return true;
            }
            return false;
        }
        return true;
    }
    addContextPath(
        contextName: string,
        path: string,
        fallback: boolean = false
    ) {
        const {
            regexp: pathRegexp
        } = PathGenerator.generate(path);
        let contextInfo = this._contextInfos.get(contextName);
        if (contextInfo == null) {
            contextInfo = [[], null];
            this._contextInfos.set(contextName, contextInfo);
        }
        contextInfo[0].push({
            path: pathRegexp,
            fallback
        });
        return pathRegexp;
    }
    setContextDefaultHref(
        contextName: string,
        href: string | null
    ) {
        let contextInfo = this._contextInfos.get(contextName);
        if (contextInfo == null) {
            contextInfo = [[], null];
            this._contextInfos.set(contextName, contextInfo);
        }
        contextInfo[1] = (href !== null ?
            PathGenerator.prepare(href) : null
        );
    }
    setContext(context: {
        name: string,
        paths: { path: string, fallback?: boolean }[],
        default?: string | null
    }) {
        context.paths.forEach(path => {
            this.addContextPath(context.name, path.path, path.fallback);
        });
        if (context.default !== undefined) {
            this.setContextDefaultHref(context.name, context.default);
        }
    }
    hrefs() {
        const hrefs: Array<string> = [];
        this._contextHrefsPairs.forEach(([, c_hrefs]) => {
            hrefs.push(...c_hrefs);
        });
        return hrefs;
    }
}
