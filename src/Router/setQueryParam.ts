import HistoryManager from "../HistoryManager";

import getLocation from "./getLocation";
import go from "./go";

export default async function setQueryParam(
    param: string,
    value: string | null | undefined,
    options: {
        emit: boolean,
        replace?: boolean
    }
) {
    await HistoryManager.onWorkFinishedPromise();

    const location = getLocation();
    if (value === undefined) {
        location.removeQueryParam(param);
    } else {
        location.addQueryParam(param, value);
    }

    await go(location.href, options);
}