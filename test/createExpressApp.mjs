import express from "express";

import { readFileSync } from "fs";
import { join, } from "path";

export default function createExpressApp(useIndexHTML) {
    const app = express();

    const distdir = join(
        import.meta.dirname, "..", "dist"
    );

    app.get("/index.js", (req, res) => {
        res.contentType("js");
        res.send(
            readFileSync(join(distdir, "index.js"))
        );
    });
    const indexHTML = (useIndexHTML ?
        readFileSync(
            join(import.meta.dirname, "index.html"),
            { encoding: "utf-8" }
        ) : (
            `<!DOCTYPE html>\n` +
            `<html>\n` +
            `    <head>\n` +
            `        <meta name="format-detection" content="telephone=no">\n` +
            `        <meta name="msapplication-tap-highlight" content="no">\n` +
            `        <meta name="viewport" content="initial-scale=1, width=device-width, viewport-fit=cover">\n` +
            `        <meta charset="utf-8">\n` +
            `        <title>history-manager - test page</title>\n` +
            `    </head>\n` +
            `    <body>\n` +
            `        <script src="/index.js"></script>\n` +
            `    </body>\n` +
            `</html>`
        )
    )
    app.get("/*", (req, res) => {
        res.send(indexHTML.replaceAll("$REPLACE_WITH_REQUESTED_PATH$", req.path));
    });

    return app;
}