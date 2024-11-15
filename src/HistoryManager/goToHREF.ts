import URLManager from "../URLManager";

export default function goToHREF(
    href: string,
    replace: boolean = false
): void {
    if (window.location.href === URLManager.construct(href, true)) {
        window.dispatchEvent(new Event("popstate"));
        return;
    }

    href = URLManager.construct(href);

    if (href[0] === "#") {
        if (replace) {
            window.location.replace(href);
        } else {
            window.location.assign(href);
        }

        return;
    }

    if (replace) {
        window.history.replaceState({}, "", href);
    } else {
        window.history.pushState({}, "", href);
    }
    window.dispatchEvent(new Event("popstate"));
}