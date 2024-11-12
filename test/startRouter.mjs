import playwright from "playwright";

/** @type {(
        page: playwright.Page,
        defaultContext?: null | string,
        base?: string
    )} */
export default function startRouter(
    page, defaultContext, base
) {
    return page.evaluate(async ({ defaultContext, base }) => {
        const Router = window.historyManager.Router;
        if (defaultContext !== undefined) {
            Router.setContext({
                name: "home",
                paths: [
                    { path: "home" }
                ],
                default: "home"
            });
            Router.setContext({
                name: "profile",
                paths: [
                    { path: "me" },
                    { path: "user/:id", fallback: true }
                ],
                default: "me"
            });
            Router.setContext({
                name: "search",
                paths: [
                    { path: "search" }
                ],
                default: "search?recent"
            });
        }

        if (base !== undefined) {
            Router.setBase(base);
        }
        await Router.start(defaultContext || undefined);
    }, { defaultContext, base });
}