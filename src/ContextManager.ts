import PathGenerator = require("./PathGenerator");

export class ContextManager {
    private _contexts: ContextsMap = new Map();
    private _hrefs: HREFsArray = [];
    private _index: number = -1;
    private _length: number = 0;
    /**
     * Removes all references after the actual index
     */
    clean(): void {
        if (this._index < this._length - 1) {
            let index: number = this._index;
            let newHREFs: HREFsArray = [];
            this._hrefs.some(c_hrefs => {
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
            this._hrefs = newHREFs;
            this._length = this._index + 1;
        }
    }
    contextOf(href: string, skipFallback: boolean = true): string | null {
        let foundContext: string | null = null;
        href = href.split("#")[0].split("?")[0];
        for (let [context, [hrefs]] of this._contexts.entries()) {
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
    insert(href: string, replace: boolean = false): void {
        this.clean();
        // get context of href
        let foundContext: string | null = this.contextOf(href, this._length > 0);
        if (foundContext == null) {
            if (this._hrefs.length > 0) {
                this._hrefs[this._hrefs.length - 1][1].push(href);
                this._length++;
                this._index++;
            }
        } else {
            let i: number = -1;
            if (this._hrefs.some((c_hrefs, index) => {
                if (c_hrefs[0] === foundContext) {
                    i = index;
                    return true;
                }
                return false;
            })) {
                let c_hrefs: [string, string[]] = this._hrefs.splice(i, 1)[0];
                if (href !== c_hrefs[1][c_hrefs[1].length - 1]) {
                    c_hrefs[1].push(href);
                    this._length++;
                    this._index++;
                }
                this._hrefs.push(c_hrefs);
            } else {
                this._hrefs.push([foundContext, [href]]);
                this._length++;
                this._index++;
            }
        }
        if (replace && this._hrefs.length > 0) {
            let lastContext: HREFsArray[0] = this._hrefs[this._hrefs.length - 1];
            if (lastContext[1].length > 1) {
                do {
                    lastContext[1].splice(lastContext[1].length - 2, 1);
                    this._length--;
                    this._index--;
                } while (
                    lastContext[1].length > 1 &&
                    lastContext[1][lastContext[1].length - 2] === href
                );
            }
        }
    }
    goBackward(): string {
        this._index = Math.max(--this._index, 0);
        return this.get()!;
    }
    goForward(): string {
        this._index = Math.min(++this._index, this._length - 1);
        return this.get()!;
    }
    get(index: number = this._index): string | null {
        let href: string;
        if (this._hrefs.some(([c, hrefs]) => {
            let length: number = hrefs.length;
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
    index(value?: number): void | number {
        if (value === void 0) {
            return this._index;
        }
        value = parseInt(value as any, 10);
        if (isNaN(value)) {
            throw new Error("value must be a number");
        }
        console.log("set index to", value);
        this._index = value;
    }
    length(): number {
        return this._length;
    }
    getContextNames(): string[] {
        return Array.from(this._contexts.keys());
    }
    getDefaultOf(context: string): string | null {
        let c: ContextInfo | undefined = this._contexts.get(context);
        if (!c) {
            return null;
        }
        let href: string | null | undefined = c[1];
        if (href == null) {
            return null;
        }
        return href;
    }
    restore(context: string): boolean {
        let tmpHREFs: HREFsArray = this._hrefs;
        this.clean();
        if (this._hrefs.length) {
            let lastContext: HREFsArray[0] = this._hrefs[this._hrefs.length - 1];
            if (lastContext[0] === context) {
                let path: string = this._contexts.get(context)![1] || lastContext[1][0];
                let numPages: number = lastContext[1].splice(1).length;
                this._length -= numPages;
                this._index -= numPages;
                lastContext[1][0] = path;
                return true;
            }
        }
        if (!this._hrefs.some((c, i) => {
            if (c[0] === context) {
                if (i < this._hrefs.length - 1) {
                    this._hrefs.push(this._hrefs.splice(i, 1)[0]);
                }
                return true;
            }
            return false;
        })) {
            let c: ContextInfo | undefined = this._contexts.get(context);
            if (c == null) {
                this._hrefs = tmpHREFs;
                return false;
            }
            let href: string | null | undefined = c[1];
            if (href != null) {
                this.insert(href);
                return true;
            }
            return false;
        }
        return true;
    }
    addContextPath(context_name: string, path: string, fallback: boolean = false): RegExp {
        let pathRegexp: RegExp = PathGenerator.generate(path);
        let context: ContextInfo | undefined = this._contexts.get(context_name);
        if (context == null) {
            this._contexts.set(context_name, context = [[], null]);
        }
        context[0].push({
            path: pathRegexp,
            fallback
        });
        return pathRegexp;
    }
    setContextDefaultHref(context_name: string, href: string | null): void {
        let context: ContextInfo | undefined = this._contexts.get(context_name);
        if (context == null) {
            this._contexts.set(context_name, context = [[], null]);
        }
        context[1] = href;
    }
    setContext(context: {
        name: string,
        paths: { path: string, fallback?: boolean }[],
        default?: string | null
    }): void {
        context.paths.forEach(path => {
            this.addContextPath(context.name, path.path, path.fallback);
        });
        if (context.default !== undefined) {
            this.setContextDefaultHref(context.name, context.default);
        }
    }
    hrefs(): string[] {
        let hrefs: string[] = [];
        this._hrefs.forEach(([c, c_hrefs]) => {
            hrefs.push.apply(hrefs, c_hrefs);
        });
        return hrefs;
    }
}

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