/**
 * Minimal query-string replacement covering the subset this router uses.
 *
 * Behaviour-compatible with query-string's defaults: keys are returned/emitted
 * in sorted order, a bare key parses to `null` (and stringifies back without an
 * "="), duplicate keys collapse to an array, `undefined` values are skipped, and
 * values are encoded/decoded with `encodeURIComponent` ("+" decoded to a space).
 * Validated field-by-field against query-string before dropping the dependency.
 */

type ParsedQuery = Record<string, string | null | (string | null)[]>;

const encode = (value: string): string => encodeURIComponent(value);
const decode = (value: string): string => decodeURIComponent(value.replace(/\+/g, " "));

function parse(input: string): ParsedQuery {
    const parsed: ParsedQuery = {};
    if (input) {
        for (const part of input.split("&")) {
            if (!part) {
                continue;
            }
            const eq = part.indexOf("=");
            const key = decode(eq === -1 ? part : part.slice(0, eq));
            const value = eq === -1 ? null : decode(part.slice(eq + 1));
            if (key in parsed) {
                const current = parsed[key];
                parsed[key] = Array.isArray(current) ? [...current, value] : [current, value];
            } else {
                parsed[key] = value;
            }
        }
    }
    // query-string returns the keys in sorted order.
    const sorted: ParsedQuery = {};
    for (const key of Object.keys(parsed).sort()) {
        sorted[key] = parsed[key];
    }
    return sorted;
}

function formatPair(key: string, value: any): string {
    return value === null ? encode(key) : `${encode(key)}=${encode(String(value))}`;
}

function stringify(obj: Record<string, any>): string {
    const parts: string[] = [];
    for (const key of Object.keys(obj).sort()) {
        const value = obj[key];
        if (value === undefined) {
            continue;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                parts.push(formatPair(key, item));
            }
        } else {
            parts.push(formatPair(key, value));
        }
    }
    return parts.join("&");
}

const queryString = { parse, stringify };
export default queryString;
