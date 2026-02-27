# Nappi - Baby Sleep Monitoring App

Modern web app for parents to monitor and improve their baby's sleep. Tracks sleep patterns, room environment (temperature, humidity, noise), delivers real-time alerts, and provides AI-powered insights via chat.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Pages](#pages)
- [API Integration](#api-integration)
- [Authentication](#authentication)
- [Real-time Alerts](#real-time-alerts)
- [Charts](#charts)
- [Types](#types)
- [Styling](#styling)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

- **UI**: [React 19](https://react.dev/) + TypeScript
- **Build**: [Vite 7](https://vite.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **HTTP**: [Axios](https://axios-http.com/) (two instances: 10s default, 60s for chat)
- **Charts**: [ECharts 6](https://echarts.apache.org/) via `echarts-for-react`
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/) - utility-first, Kodchasan font
- **State**: React `useState` per page - no Redux/Zustand
- **Auth**: Session cookie via `document.cookie` (no JWT)

---

## Getting Started

### Prerequisites

- **Node.js**: 20.19+ or 22.12+
- **Backend**: Running at `http://localhost:8000` (see backend README)

### Install and Run

```bash
cd nappi-frontend
npm install
npm run dev     # http://localhost:5173
```

### Other Commands

```bash
npm run build   # Production build to dist/
npm run preview # Preview production build
npm run lint    # ESLint
npx tsc --noEmit  # Type check
```

---

## Project Structure

```
nappi-frontend/
├── src/
│   ├── api/                        # Backend API client layer
│   │   ├── client.ts               # Axios instances (api: 10s, chatApi: 60s)
│   │   ├── auth.ts                 # Auth + baby notes endpoints
│   │   ├── sleep.ts                # Sleep summary + status
│   │   ├── room.ts                 # Room metrics
│   │   ├── stats.ts                # Statistics, trends, patterns, predictions, AI
│   │   ├── chat.ts                 # AI chat endpoint
│   │   └── alerts.ts               # Alerts, interventions, push subscriptions
│   │
│   ├── components/                 # Reusable UI components
│   │   ├── Layout.tsx              # Main layout: burger menu sidebar + floating chat button
│   │   ├── LayoutContext.tsx        # Context for menu open/close + page loading state
│   │   ├── ProtectedRoute.tsx      # Auth guard (redirects to /welcome or /onboarding)
│   │   ├── ChatFloatingButton.tsx  # Floating button linking to /chat
│   │   └── Btn.tsx                 # Welcome page button
│   │
│   ├── pages/                      # Page components
│   │   ├── Welcome.tsx             # Landing page with animated gradient
│   │   ├── Login.tsx               # Username + password form
│   │   ├── Signup.tsx              # Parent registration (name, username, password)
│   │   ├── Onboarding.tsx          # Register baby post-signup
│   │   ├── HomeDashboard.tsx       # Main dashboard (8 data fetches, 6 sections)
│   │   ├── Statistics.tsx          # Charts: sensor trends, daily sleep, patterns, AI analysis
│   │   ├── Chat.tsx                # AI chat with markdown rendering
│   │   ├── Notifications.tsx       # Alert history + real-time SSE + delete
│   │   └── UserProfile.tsx         # Settings, notes CRUD, push toggle, password change
│   │
│   ├── hooks/
│   │   └── useAlerts.ts            # SSE connection for real-time alerts
│   │
│   ├── types/
│   │   ├── auth.ts                 # User, Baby, auth request/response types
│   │   └── metrics.ts              # Sleep, sensor, stats, AI types
│   │
│   ├── utils/
│   │   └── session.ts              # Session cookie helpers (get/set/remove)
│   │
│   ├── styles/
│   │   └── fonts.css               # Kodchasan font import
│   │
│   ├── constants.ts                # All named constants (thresholds, timeouts, limits)
│   ├── App.tsx                     # React Router setup
│   ├── main.tsx                    # DOM render + Service Worker registration
│   └── index.css                   # Tailwind base
│
├── public/                         # Static assets (icons, logo, sw.js)
├── tailwind.config.js              # Tailwind theme (Kodchasan font)
├── vite.config.ts                  # Vite + React plugin
├── tsconfig.app.json               # TypeScript config
└── package.json                    # Dependencies and scripts
```

---

## Pages

### Public (no auth required)

| Route | Page | Description |
|-------|------|-------------|
| `/welcome` | Welcome | Animated landing page, "Let's Nap" button |
| `/login` | Login | Username + password, stores session cookie |
| `/signup` | Signup | Parent registration (name, username, password) |

### Protected (requires auth)

| Route | Page | Layout | Description |
|-------|------|--------|-------------|
| `/onboarding` | Onboarding | None | Register baby for users without one |
| `/` | HomeDashboard | Layout | Main dashboard with all data |
| `/statistics` | Statistics | Layout | Charts + AI analysis |
| `/chat` | Chat | Layout | AI conversation |
| `/notifications` | Notifications | Layout | Alert history + real-time |
| `/user` | UserProfile | Layout | Settings, notes, push, password |

### HomeDashboard Sections

1. **Header** - Greeting, baby profile card (name, age)
2. **Last Nap** - Start/end times, avg temperature/humidity, max noise (from sleep summary)
3. **Sleep Status + Intervention** - Current state, "Mark Asleep/Awake" button, cooldown notice
4. **Preferences** - 4 metric cards showing optimal conditions (tap to expand)
5. **Room Status** - Live temperature/humidity/noise grid with status indicators (null-safe)
6. **AI Insights** - Sleep summary, environment, next sleep prediction, today's tip, quick insights

### Statistics Sections

1. **Sensor Trend Chart** - Line chart (temperature/humidity/noise toggle), date range with 90-day max clamping
2. **Daily Sleep Chart** - Bar chart with color coding by hours
3. **Awakenings per Session** - Line chart showing awakening ratio trend (lower is better)
4. **Sleep Patterns Chart** - Polar chart showing clustered sleep time windows
5. **AI Analysis** - Weekly trends, enhanced awakening analysis, recommendations

### Notifications Features

- Real-time alerts via SSE (`useAlerts` hook, auto-reconnect 5s)
- History from API (last 50 alerts)
- Mark individual / all as read
- Severity styling: colored left border (blue=info, amber=warning, red=critical)
- Unread badge: "New" pill

### Chat Features

- Message history with user (teal) and AI (white) bubbles
- Markdown rendering for AI responses (**bold**, *italic*)
- Suggestion prompts in empty state
- Enter to send, Shift+Enter for newline
- 60s timeout for AI responses

---

## API Integration

### Client Setup (`src/api/client.ts`)

```typescript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
});

export const chatApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 60000,  // AI chat needs longer timeout
});
```

**Note**: Base URL defaults to `http://localhost:8000`. Set the `VITE_API_URL` environment variable for production.

### API Modules

| Module | Key Functions |
|--------|---------------|
| `auth.ts` | `signin`, `signup`, `registerBaby`, `changePassword`, baby notes CRUD |
| `sleep.ts` | `fetchLastSleepSummary`, `getSleepStatus` |
| `room.ts` | `fetchCurrentRoomMetrics` |
| `stats.ts` | `fetchSensorStats`, `fetchSleepPatterns`, `fetchDailySleep`, `fetchOptimalStats`, `fetchInsights`, `fetchEnhancedInsights`, `fetchTrends`, `fetchSchedulePrediction`, `fetchAISummary` |
| `alerts.ts` | `fetchAlerts`, `fetchUnreadCount`, `markAlertAsRead`, `markAllAlertsAsRead`, `deleteAlerts`, `fetchSleepStatus`, `fetchCooldownStatus`, `submitIntervention`, SSE stream, push subscribe/unsubscribe/status |
| `chat.ts` | `sendChatMessage` (baby_id, user_id, message, history) |

---

## Authentication

### Session Cookie (`src/utils/session.ts`)

Auth state is stored in a **session cookie** (not localStorage):

```typescript
getSession()        // Read nappi_user cookie
setSession(value)   // Set session cookie (no expires - cleared on browser close)
removeSession()     // Delete cookie
```

All pages and components use these helpers instead of direct `localStorage` calls.

### Auth Guard (`ProtectedRoute.tsx`)

- Checks session cookie exists
- Redirects to `/welcome` if not logged in
- Redirects to `/onboarding` if `baby_id` is missing
- Clears corrupted cookie data automatically

### User Data Shape

```typescript
interface AuthUser {
  user_id: number;
  username: string;
  baby_id: number | null;
  baby: Baby | null;
  first_name: string;
  last_name: string;
}
```

---

## Real-time Alerts

### `useAlerts` Hook (`src/hooks/useAlerts.ts`)

```typescript
const { connected, latestAlert, alerts } = useAlerts({
  userId: user?.user_id,
  onNewAlert: (alert) => { /* prepend to list */ },
});
```

- Connects to SSE at `/alerts/stream?user_id=X`
- Auto-reconnects after 5 seconds on disconnect
- Keeps last 100 alerts in memory
- Returns connection status and latest alert

---

## Charts

All charts use **ECharts 6** via `echarts-for-react`.

| Chart | Page | Type | Data |
|-------|------|------|------|
| Sensor Trends | Statistics | Line | Temperature/humidity/noise daily averages |
| Daily Sleep | Statistics | Bar | Total sleep hours per day (color: green >12h, indigo >10h, amber <10h) |
| Awakenings/Session | Statistics | Line | Awakening ratio per sleep session over time |
| Sleep Patterns | Statistics | Polar/Pie | Clustered sleep time windows by time of day |

### Date Range Handling

Statistics page enforces:
- **Max 90 days** via `clampDateRange()` function
- `min`/`max` attributes on date inputs
- Visual "Max 3 months" label
- Start date can't exceed end date

---

## Types

### `src/types/metrics.ts`

```typescript
// Sleep - no SleepStage/SleepStageMetric (removed)
interface LastSleepSummary {
  baby_name: string;
  started_at: string;
  ended_at: string;
  total_sleep_minutes: number;
  awakenings_count: number;
  avg_temperature?: number | null;
  avg_humidity?: number | null;
  max_noise?: number | null;
}

// Room - all fields Optional (no fake defaults, no light_lux)
interface RoomMetrics {
  temperature_c?: number | null;
  humidity_percent?: number | null;
  noise_db?: number | null;
  measured_at?: string | null;
  notes?: string | null;
}
```

Other types: `SensorDataPoint`, `SleepPattern`, `DailySleepPoint`, `OptimalStatsResponse`, `TrendsResponse`, `SchedulePredictionResponse`, `AISummaryResponse`, `EnhancedInsightsResponse`, `StructuredInsight`.

### `src/types/auth.ts`

`Baby`, `AuthUser`, `SignUpRequest`, `SignUpResponse`, `SignInRequest`, `SignInResponse`, `RegisterBabyRequest`, `BabyNote`, `NotesListResponse`.

---

## Styling

### Approach

**Tailwind CSS** utility classes - no CSS modules, no styled-components.

### Theme

- **Font**: Kodchasan (Google Fonts, imported via `styles/fonts.css`)
- **Primary**: Teal `#4ECDC4` / `#5DCCCC` / `#3dbdb5`
- **Accent**: Gold `#ffc857` / `#FFD166`
- **Backgrounds**: Soft gradients `from-[#fee2d6] via-[#FAFBFC] to-[#e2f9fb]`
- **Sensor colors**: Orange (temp), Blue (humidity), Green (noise)

### Animations

Defined as inline `@keyframes` in component files:
- `fadeIn` - opacity + transform
- `slideInLeft` / `slideInRight` - horizontal slide
- `slideUp` - vertical slide
- `pulse` - scale oscillation
- `bounce` - loading dots

---

## Troubleshooting

### CORS errors from backend

Backend must have `http://localhost:5173` in its `CORS_ORIGINS` (configured in backend `settings.py`).

### Chat timeout

AI chat uses a 60s timeout (`chatApi`). Do not reduce it - Gemini can be slow.

### Session cookie not persisting

Session cookies are cleared when the browser **fully closes** (not just the tab). This is by design - no `expires`/`max-age` is set.

### Port already in use

```bash
lsof -ti:5173 | xargs kill -9
```

### TypeScript errors

```bash
npx tsc --noEmit   # See all type errors
```

### Changes not showing

- Verify dev server is running (`npm run dev`)
- Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R
- Check terminal for compilation errors

### Service Worker caching stale content

Unregister the service worker in browser DevTools > Application > Service Workers, then hard refresh.
