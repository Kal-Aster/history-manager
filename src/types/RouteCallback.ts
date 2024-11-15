import KeyMap from "./KeyMap";
import Location from "./Location";

type RouteCallback = {
    (
        location: Location,
        keymap: KeyMap,
        redirection: {
            location: Location,
            keymap: KeyMap
        } | null
    ): void;
};
export default RouteCallback;