export const LEADING_DELIMITER = /^[\\\/]+/;
// An optional group (path-to-regexp v8 "{...}") whose content already starts
// with a delimiter, e.g. a catch-all fallback "{/*route}". A leading "/" must
// NOT be injected in front of it.
export const LEADING_OPTIONAL_DELIMITER = /^\{[\\\/]/;
export const TRAILING_DELIMITER = /[\\\/]+$/;
export const DELIMITER_NOT_IN_PARENTHESES = /[\\\/]+(?![^(]*[)])/g;