/**
 * Centralized constants for the Nappi frontend.
 *
 * All thresholds, limits, and magic numbers used across pages are defined here
 * with source citations matching the backend constants.py.
 *
 * IMPORTANT: Keep these in sync with backend/app/core/constants.py.
 */

// =============================================================================
// ENVIRONMENTAL THRESHOLDS — UI Status Display
// =============================================================================

// Room temperature thresholds (Celsius).
// Source: AAP recommends 20-22.2°C (68-72°F).
// Source: Wailoo et al., Archives of Disease in Childhood, 1989 — thermal neutrality 20-22°C.
// Source: Franco et al., Sleep, 2001 — 24°C increases arousability.
export const TEMP_ALERT_HIGH_C = 26;
export const TEMP_ALERT_LOW_C = 18;

// Noise level limit (dB A-weighted).
// Source: Hugh et al., "Infant Sleep Machines and Hazardous Sound Pressure Levels,"
//   Pediatrics, 2014 — hospital nursery recommendation: 50 dB average.
export const NOISE_ALERT_HIGH_DB = 50;

// =============================================================================
// API TIMEOUTS (milliseconds)
// =============================================================================

export const API_STANDARD_TIMEOUT_MS = 10_000;  // 10 seconds for standard requests
export const API_CHAT_TIMEOUT_MS = 60_000;       // 60 seconds for AI chat (Gemini latency)

// =============================================================================
// ALERT / NOTIFICATION LIMITS
// =============================================================================

export const ALERTS_PAGE_SIZE = 50;              // Alerts fetched per page (matches backend)
export const ALERTS_MAX_IN_MEMORY = 100;         // Max SSE alerts kept in useAlerts hook

// =============================================================================
// CHAT
// =============================================================================

export const CHAT_MAX_HISTORY_MESSAGES = 10;     // Messages sent as context to AI

// =============================================================================
// SLEEP DURATION CHART THRESHOLDS (hours)
// =============================================================================

// Source: NSF (National Sleep Foundation) — 12+ hours is excellent for most infants,
//   10-12 is adequate, <10 is below recommended.
export const SLEEP_EXCELLENT_THRESHOLD_HOURS = 12;
export const SLEEP_GOOD_THRESHOLD_HOURS = 10;
export const SLEEP_CHART_Y_MAX_HOURS = 15;

// =============================================================================
// DATE RANGE LIMITS
// =============================================================================

export const STATS_MAX_RANGE_DAYS = 90;          // Max date range for stats (matches backend)
export const SENSOR_DEFAULT_RANGE_DAYS = 14;     // Default range for sensor chart
export const AWAKENING_DEFAULT_RANGE_DAYS = 30;  // Default range for awakening/session chart

// =============================================================================
// UI TIMING
// =============================================================================

export const LOADING_SPINNER_THRESHOLD_MS = 300;   // Show spinner only after this delay
export const LOADING_MIN_DISPLAY_MS = 1500;        // Min time to show spinner once shown
export const PASSWORD_SUCCESS_TIMEOUT_MS = 2000;   // Auto-close password success message
export const SSE_RECONNECT_DELAY_MS = 5000;        // Delay before SSE reconnection attempt

// =============================================================================
// INPUT LIMITS
// =============================================================================

export const NOTE_TITLE_MAX_LENGTH = 200;

// =============================================================================
// SESSION
// =============================================================================

export const SESSION_COOKIE_NAME = 'nappi_user';
