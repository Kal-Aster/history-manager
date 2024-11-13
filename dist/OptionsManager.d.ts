/**
 * @author Giuliano Collacchioni @2020
 */
export declare function initEventListener(): () => void;
export type Options = {
    [key: string]: any;
};
/**
 * Gets the options stored in the url
 */
export declare function get(): Options;
/**
 * Sets the options
 * @param opts
 */
export declare function set(opts: Options): Promise<void>;
/**
 * Add an option to those stored in the url
 */
export declare function add(opt: string, value?: string): Promise<void>;
/**
 * Remove given option
 * @param opt
 */
export declare function remove(opt: string): Promise<void>;
/**
 * Go to the given href adding the specified options
 * @param href
 * @param opts
 * @param replace
 */
export declare function goWith(href: string, opts: Options, replace?: boolean): Promise<void>;
/**
 * Get the href with the options portion
 */
export declare function clearHref(): string;
