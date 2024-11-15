import onCatchPopState from "./onCatchPopState"

export default async function onCatchPopStatePromise() {
    return new Promise<void>(resolve => {
        onCatchPopState(resolve, true);
    });
}