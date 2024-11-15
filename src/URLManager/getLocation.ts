import getLocationBase from "./getLocationBase";
import getLocationPathname from "./getLocationPathname";
import getInternalState from "./getInternalState";

export default function getLocation(): string {
    return `${getLocationBase()}${getInternalState().BASE[0] === "#" ? getLocationPathname() : ""}`;
}