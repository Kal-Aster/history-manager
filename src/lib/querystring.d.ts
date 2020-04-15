declare var querystring: {
    encode(query: { [key: string]: any }): string;
    decode(string: string): { [key: string]: any }
};

export = querystring;