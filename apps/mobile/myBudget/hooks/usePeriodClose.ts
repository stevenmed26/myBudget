import { useCallback } from "react";

import { closeCurrentPeriod } from "../api";
import { devLog } from "../lib/devlog";

export function usePeriodClose({ reload }: { reload: () => Promise<void> }) {
  const closePeriod = useCallback(async () => {
    const result = await closeCurrentPeriod();
    devLog("period close requested", {
      period_start: result.period_start,
      period_end: result.period_end,
      already_closed: result.already_closed,
    });
    await reload();
    return result;
  }, [reload]);

  return { closePeriod };
}
