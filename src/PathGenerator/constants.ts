export const LEADING_DELIMITER = /^[\\\/]+/;
export const TRAILING_DELIMITER = /[\\\/]+$/;
export const DELIMITER_NOT_IN_PARENTHESES = /[\\\/]+(?![^(]*[)])/g;