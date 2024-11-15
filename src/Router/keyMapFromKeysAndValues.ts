import { Key } from "path-to-regexp";

import KeyMap from "../types/KeyMap";

/**
 * Generate a KeyMap from keys and values
 * @param keys
 * @param values
 */
export default function keyMapFromKeysAndValues(
    keys: Array<Key>,
    values: Array<any>
): KeyMap {
    const map: KeyMap = new Map();
    keys.forEach((key, index) => {
        map.set(key.name, values[index]);
    });
    return map;
}