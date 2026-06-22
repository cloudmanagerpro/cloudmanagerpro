import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import type { ActionExecutionResult } from "@/lib/types";

/** Best-effort error message extraction for action mutations. */
export function actionError(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Surface an action result with the right tone:
 * - executed → success (a real cloud change happened)
 * - simulated / blocked → warning (never a silent "success")
 *
 * Mirrors the safe-by-default backend contract where execute may return
 * `{ executed: false, simulated: true, message }`.
 */
export function notifyActionResult(
  result: ActionExecutionResult | undefined,
  fallback = "Action complete",
) {
  const message = result?.message ?? fallback;
  const simulated =
    result?.simulated === true || result?.providerMode === "SIMULATED";

  if (result?.executed) {
    toast.success(message);
    return;
  }

  if (simulated) {
    toast.warning(message, {
      description: "Simulated — no real cloud changes were made.",
    });
    return;
  }

  toast.warning(
    message ||
      "Execution is blocked. Enable real cloud actions on the server to proceed.",
  );
}
