let LOCATION_PATHNAME: string | null = null;
export default function getLocationPathname() {
    if (LOCATION_PATHNAME !== null) {
        return LOCATION_PATHNAME;
    }
    return LOCATION_PATHNAME = window.location.pathname;
}