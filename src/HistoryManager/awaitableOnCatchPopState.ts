import onCatchPopState from "./onCatchPopState"

export default async function awaitableOnCatchPopState(
    executor: () => void
) {
    const awaiter = new Promise<void>(resolve => {
        onCatchPopState(resolve, true);
    });
    executor();
    return awaiter;
}