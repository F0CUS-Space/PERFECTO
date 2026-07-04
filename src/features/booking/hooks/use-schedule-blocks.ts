"use client";

import { useEffect, useState } from "react";

import { fetchUpcomingScheduleBlocks } from "@/features/booking/schedule-availability-actions";
import type { ScheduleBlockSnapshot } from "@/features/booking/schedule-block-utils";

export function useScheduleBlocks() {
  const [blocks, setBlocks] = useState<ScheduleBlockSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchUpcomingScheduleBlocks()
      .then((data) => {
        if (active) setBlocks(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { blocks, loading };
}
