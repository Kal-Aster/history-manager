import HistoryManager from "../HistoryManager";
import NavigationLock from "../NavigationLock";
import OptionsManager from "../OptionsManager";

/**
 * The single popstate orchestrator. Replaces the three per-module popstate
 * listeners so that behaviour no longer depends on listener registration order.
 *
 * Phase 1 — self-induced steps: if a module is waiting for the popstate it just
 * triggered (a pending one-shot continuation), deliver it and stop. At most one
 * is pending at a time (the work queue serialises navigation flows); the fixed
 * order below only fixes the tie-break deterministically.
 *
 * Phase 2 — real popstate: route explicitly. A lock signal (a live lock or a
 * `locked` marker) goes to NavigationLock, everything else to HistoryManager.
 */
export default function onpopstate(event: PopStateEvent): void {
    if (
        OptionsManager.resumeIfWaiting() ||
        HistoryManager.resumeIfWaiting() ||
        NavigationLock.resumeIfWaiting()
    ) {
        // Shield user-land popstate handlers from internal navigation steps.
        event.stopImmediatePropagation();
        return;
    }

    if (!HistoryManager.isStarted()) {
        return;
    }

    if (NavigationLock.hasLockSignal()) {
        NavigationLock.handlePopState();
        return;
    }

    HistoryManager.handlePopState();
}
