export interface LastSleepSummary {
  baby_name: string;
  started_at: string;
  ended_at: string;
  total_sleep_minutes: number;
  awakenings_count: number;
  avg_temperature?: number | null;
  avg_humidity?: number | null;
  max_noise?: number | null;
}

export interface RoomMetrics {
  temperature_c?: number | null;
  humidity_percent?: number | null;
  noise_db?: number | null;
  measured_at?: string | null;
  notes?: string | null;
}

// ========== Statistics API Types ==========

export interface SensorDataPoint {
  date: string;
  value: number;
}

export interface SensorStatsResponse {
  baby_id: number;
  sensor: 'temperature' | 'humidity' | 'noise';
  start_date: string;
  end_date: string;
  data: SensorDataPoint[];
}

export interface SleepPattern {
  cluster_id: number;
  label: string;
  avg_start: string;
  avg_end: string;
  avg_duration_hours: number;
  session_count: number;
  earliest_start: string;
  latest_end: string;
}

export interface SleepPatternsResponse {
  baby_id: number;
  month: number;
  year: number;
  total_sessions: number;
  patterns: SleepPattern[];
}

export interface DailySleepPoint {
  date: string;
  total_hours: number;
  sessions_count: number;
  awakenings_count: number;
}

export interface DailySleepResponse {
  baby_id: number;
  start_date: string;
  end_date: string;
  data: DailySleepPoint[];
}

export interface EnvironmentalChange {
  start_value: number;
  end_value: number;
  change_percent: number;
  direction: 'increase' | 'decrease';
}

export interface InsightsResponse {
  baby_id: number;
  event_id: number;
  awakened_at: string;
  sleep_duration_minutes: number;
  environmental_changes: Record<string, EnvironmentalChange>;
  insights: string;
  correlation_id: number;
}

export interface OptimalStatsResponse {
  baby_id: number;
  temperature: number | null;
  humidity: number | null;
  noise: number | null;
  has_data: boolean;
}

// ========== AI-Powered Insights Types ==========

// --- Structured Insights ---

export interface StructuredInsight {
  likely_cause: string;
  actionable_tips: string[];
  environment_assessment: string;
  age_context: string;
  sleep_quality_note: string;
}

export interface EnhancedInsightsResponse {
  baby_id: number;
  event_id: number | null;
  awakened_at: string | null;
  sleep_duration_minutes: number | null;
  environmental_changes: Record<string, EnvironmentalChange>;
  insights: StructuredInsight | null;
  simple_insight: string | null;
  correlation_id: number | null;
}

// --- Trend Analysis ---

export interface AgeRecommendation {
  min_hours: number;
  max_hours: number;
  typical_naps: string;
  night_hours: string;
}

export interface WeeklyTrend {
  avg_sleep_hours: number;
  trend: 'improving' | 'declining' | 'stable';
  trend_percentage: number;
  consistency_score: number;
  total_sessions: number;
  avg_sessions_per_day: number;
  best_day: string | null;
  worst_day: string | null;
}

export interface MonthlyTrend {
  avg_sleep_hours: number;
  trend: 'improving' | 'declining' | 'stable';
  trend_percentage: number;
  consistency_score: number;
  total_sessions: number;
}

export interface AITrendInsights {
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  age_comparison: string;
}

export interface TrendsResponse {
  baby_id: number;
  baby_name: string;
  age_months: number;
  age_recommendation: AgeRecommendation;
  weekly: WeeklyTrend | null;
  monthly: MonthlyTrend | null;
  ai_insights: AITrendInsights | null;
}

// --- Schedule Prediction ---

export interface WakeWindowRange {
  min: number;
  max: number;
}

export interface NextSleepPrediction {
  predicted_time: string;
  predicted_time_formatted: string;
  confidence: 'high' | 'medium' | 'low';
  type: 'nap' | 'bedtime';
  based_on: string;
  minutes_until: number;
  wake_window_status: string;
}

export interface SchedulePredictionResponse {
  baby_id: number;
  generated_at: string;
  wake_window_range_hours: WakeWindowRange;
  optimal_bedtime: string;
  current_wake_duration_minutes: number | null;
  next_sleep: NextSleepPrediction | null;
  suggestions: string[];
}

// --- AI Summary (Home Dashboard) ---

export interface SleepQualitySummary {
  last_sleep_hours: number | null;
  trend_direction: 'improving' | 'stable' | 'declining' | null;
  message: string;
}

export interface EnvironmentStatus {
  status: 'optimal' | 'needs_attention' | 'unknown';
  temperature_status: string | null;
  humidity_status: string | null;
  noise_status: string | null;
  message: string;
}

export interface AISummaryResponse {
  baby_id: number;
  baby_name: string;
  generated_at: string;
  sleep_summary: SleepQualitySummary;
  environment: EnvironmentStatus;
  next_sleep_prediction: string | null;
  next_sleep_time: string | null;
  todays_tip: string;
  weekly_trend: 'improving' | 'stable' | 'declining' | null;
  trend_message: string | null;
  quick_insights: string[];
}
