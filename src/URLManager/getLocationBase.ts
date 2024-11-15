let LOCATION_BASE: string | null = null;
export default function getLocationBase() {
    if (LOCATION_BASE !== null) {
        return LOCATION_BASE;
    }
    return LOCATION_BASE = `${
        window.location.protocol
    }//${
        window.location.host
    }`;
}