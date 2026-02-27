import { api } from './client';
import type {
  SensorStatsResponse,
  SleepPatternsResponse,
  DailySleepResponse,
  InsightsResponse,
  OptimalStatsResponse,
  TrendsResponse,
  SchedulePredictionResponse,
  AISummaryResponse,
  EnhancedInsightsResponse,
} from '../types/metrics';

/**
 * Fetch sensor data averages over a time range for graphing.
 * Data comes from daily_summary table (one point per day).
 */
export async function fetchSensorStats(
  babyId: number,
  sensor: 'temperature' | 'humidity' | 'noise',
  startDate: string,
  endDate: string
): Promise<SensorStatsResponse> {
  const res = await api.get<SensorStatsResponse>('/stats/sensors', {
    params: {
      baby_id: babyId,
      sensor,
      start_date: startDate,
      end_date: endDate,
    },
  });
  return res.data;
}

/**
 * Fetch sleep time patterns for a specific month.
 * Returns clustered sleep time windows with averaged start/end times.
 */
export async function fetchSleepPatterns(
  babyId: number,
  month?: number,
  year?: number
): Promise<SleepPatternsResponse> {
  const params: Record<string, number> = { baby_id: babyId };
  if (month !== undefined) params.month = month;
  if (year !== undefined) params.year = year;

  const res = await api.get<SleepPatternsResponse>('/stats/sleep-patterns', {
    params,
  });
  return res.data;
}

/**
 * Fetch total sleep hours per day over a time range.
 * Returns daily sleep totals and session counts for graphing.
 */
export async function fetchDailySleep(
  babyId: number,
  startDate: string,
  endDate: string
): Promise<DailySleepResponse> {
  const res = await api.get<DailySleepResponse>('/stats/daily-sleep', {
    params: {
      baby_id: babyId,
      start_date: startDate,
      end_date: endDate,
    },
  });
  return res.data;
}

/**
 * Fetch AI-powered insights about a baby's sleep/awakening.
 * Analyzes environmental factors and provides actionable tips.
 */
export async function fetchInsights(
  babyId: number,
  eventId?: number
): Promise<InsightsResponse> {
  const params: Record<string, number> = { baby_id: babyId };
  if (eventId !== undefined) params.event_id = eventId;

  const res = await api.get<InsightsResponse>('/stats/insights', {
    params,
  });
  return res.data;
}

/**
 * Fetch optimal sleep conditions for a baby.
 * Returns the calculated optimal temperature, humidity, and noise levels.
 */
export async function fetchOptimalStats(
  babyId: number
): Promise<OptimalStatsResponse> {
  const res = await api.get<OptimalStatsResponse>('/stats/optimal', {
    params: { baby_id: babyId },
  });
  return res.data;
}

/**
 * Fetch comprehensive sleep trend analysis for a baby.
 * Returns 7-day and 30-day trends with AI-generated insights.
 */
export async function fetchTrends(
  babyId: number
): Promise<TrendsResponse> {
  const res = await api.get<TrendsResponse>('/stats/trends', {
    params: { baby_id: babyId },
  });
  return res.data;
}

/**
 * Fetch schedule prediction for a baby.
 * Predicts next sleep window based on patterns and wake windows.
 */
export async function fetchSchedulePrediction(
  babyId: number
): Promise<SchedulePredictionResponse> {
  const res = await api.get<SchedulePredictionResponse>('/stats/schedule-prediction', {
    params: { baby_id: babyId },
  });
  return res.data;
}

/**
 * Fetch comprehensive AI summary for the home dashboard.
 * Combines sleep quality, environment, predictions, and tips.
 */
export async function fetchAISummary(
  babyId: number
): Promise<AISummaryResponse> {
  const res = await api.get<AISummaryResponse>('/stats/ai-summary', {
    params: { baby_id: babyId },
  });
  return res.data;
}

/**
 * Fetch enhanced AI insights with structured multi-section response.
 * Returns detailed analysis including likely cause, tips, and context.
 */
export async function fetchEnhancedInsights(
  babyId: number,
  eventId?: number
): Promise<EnhancedInsightsResponse> {
  const params: Record<string, number> = { baby_id: babyId };
  if (eventId !== undefined) params.event_id = eventId;

  const res = await api.get<EnhancedInsightsResponse>('/stats/insights-enhanced', {
    params,
  });
  return res.data;
}
