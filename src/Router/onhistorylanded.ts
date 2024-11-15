import emit from "./emit";
import getInternalState from "./getInternalState";

export default function onhistorylanded() {
    const state = getInternalState();

    if (state.emitRoute) {
        emit();
    } else {
        state.emitRoute = true;
    }
}
