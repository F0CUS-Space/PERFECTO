"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchUpcomingScheduleBlocks } from "@/features/booking/schedule-availability-actions";
import type { ScheduleBlockSnapshot } from "@/features/booking/schedule-block-utils";

const REFRESH_MS = 30_000;

export function useScheduleBlocks() {
  const [blocks, setBlocks] = useState<ScheduleBlockSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchUpcomingScheduleBlocks();
    setBlocks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return { blocks, loading, refresh };
}
