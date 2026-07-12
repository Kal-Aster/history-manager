import onNonLockingWorkFinished from "./onNonLockingWorkFinished";

export default async function awaitableOnNonLockingWorkFinished() {
    return new Promise<void>(resolve => {
        onNonLockingWorkFinished(resolve, null);
    });
}
