import { api } from './client';
import type { LastSleepSummary } from '../types/metrics';

export async function fetchLastSleepSummary(babyId: number): Promise<LastSleepSummary> {
  const res = await api.get<LastSleepSummary>('/sleep/latest', {
    params: { baby_id: babyId }
  });
  return res.data;
}

export async function getSleepStatus(babyId: number): Promise<{ is_sleeping: boolean; sleep_started_at?: string; sleep_duration_minutes?: number }> {
  const res = await api.get(`/sensor/sleep-status/${babyId}`);
  return res.data;
}
