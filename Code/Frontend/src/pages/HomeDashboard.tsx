import React, { useEffect, useState, useCallback } from 'react';
import { fetchLastSleepSummary } from '../api/sleep';
import { fetchCurrentRoomMetrics } from '../api/room';
import { fetchSleepStatus, fetchCooldownStatus, submitIntervention } from '../api/alerts';
import { fetchOptimalStats, fetchInsights, fetchAISummary, fetchSchedulePrediction } from '../api/stats';
import type { LastSleepSummary, RoomMetrics, OptimalStatsResponse, InsightsResponse, AISummaryResponse, SchedulePredictionResponse } from '../types/metrics';
import type { AuthUser } from '../types/auth';
import { useLayoutContext } from '../components/LayoutContext';
import { getSession } from '../utils/session';
import { TEMP_ALERT_HIGH_C, TEMP_ALERT_LOW_C, NOISE_ALERT_HIGH_DB, LOADING_SPINNER_THRESHOLD_MS, LOADING_MIN_DISPLAY_MS } from '../constants';

// Helper function to calculate age from birthdate
const calculateAge = (birthdate: string): string => {
  const birth = new Date(birthdate);
  const today = new Date();
  const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());

  if (months < 1) {
    const days = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  } else if (months < 24) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
};

// Get greeting based on time of day
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Format time from ISO string to HH:MM
const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
};

type MetricType = 'temp' | 'soon' | 'humidity' | 'noise' | null;

const HomeDashboard: React.FC = () => {
  const { setMenuOpen, setPageLoading } = useLayoutContext();

  const [sleepSummary, setSleepSummary] = useState<LastSleepSummary | null>(null);
  const [roomMetrics, setRoomMetrics] = useState<RoomMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [openMetric, setOpenMetric] = useState<MetricType>(null);
  const [showSpinner, setShowSpinner] = useState(false);
  
  // Sleep status and intervention state
  const [isSleeping, setIsSleeping] = useState(false);
  const [inCooldown, setInCooldown] = useState(false);
  const [, setCooldownRemaining] = useState<number | null>(null);
  const [interventionLoading, setInterventionLoading] = useState(false);
  
  // Optimal stats state
  const [optimalStats, setOptimalStats] = useState<OptimalStatsResponse | null>(null);
  
  // Insights state
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  
  // AI Summary state (rich multi-section recommendations)
  const [aiSummary, setAiSummary] = useState<AISummaryResponse | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  
  // Schedule prediction state
  const [schedulePrediction, setSchedulePrediction] = useState<SchedulePredictionResponse | null>(null);

  useEffect(() => {
    setPageLoading(loading);
  }, [loading, setPageLoading]);

  useEffect(() => {
    const stored = getSession();
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const loadData = useCallback(async (babyId: number) => {
    try {
      setLoading(true);
      setError(null);
      setShowSpinner(false); // Reset spinner state

      // 1. The Data Promise - now with baby_id
      const dataPromise = Promise.all([
        fetchLastSleepSummary(babyId),
        fetchCurrentRoomMetrics(babyId)
      ]);

      // 2. The threshold promise — show spinner only after delay
      const thresholdPromise = new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), LOADING_SPINNER_THRESHOLD_MS));

      // 3. Race them
      const winner = await Promise.race([dataPromise.then(() => 'data'), thresholdPromise]);

      if (winner === 'data') {
        // Scenario A: Fast (<300ms). Show no spinner, just render data.
        const [sleep, room] = await dataPromise;
        setSleepSummary(sleep);
        setRoomMetrics(room);
        setLoading(false);
      } else {
        // Scenario B: Slow (>300ms). Show spinner AND wait 1.5s minimum.
        setShowSpinner(true);

        const minLoadingTime = new Promise((resolve) => setTimeout(resolve, LOADING_MIN_DISPLAY_MS));
        const [[sleep, room]] = await Promise.all([dataPromise, minLoadingTime]);

        setSleepSummary(sleep);
        setRoomMetrics(room);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load data from server.');
      setLoading(false);
      setShowSpinner(false);
    }
  }, []);

  // Load sleep status for the baby
  const loadSleepStatus = useCallback(async (babyId: number) => {
    try {
      const [sleepStatus, cooldownStatus] = await Promise.all([
        fetchSleepStatus(babyId),
        fetchCooldownStatus(babyId),
      ]);
      setIsSleeping(sleepStatus.is_sleeping);
      setInCooldown(cooldownStatus.in_cooldown);
      setCooldownRemaining(cooldownStatus.cooldown_remaining_minutes ?? null);
    } catch (err) {
      console.error('Failed to load sleep status:', err);
    }
  }, []);

  // Load optimal stats for the baby
  const loadOptimalStats = useCallback(async (babyId: number) => {
    try {
      const stats = await fetchOptimalStats(babyId);
      setOptimalStats(stats);
    } catch (err) {
      console.error('Failed to load optimal stats:', err);
    }
  }, []);

  // Load AI insights for the baby
  const loadInsights = useCallback(async (babyId: number) => {
    try {
      const insightsData = await fetchInsights(babyId);
      setInsights(insightsData);
    } catch (err) {
      console.error('Failed to load insights:', err);
    }
  }, []);

  // Load comprehensive AI summary for the baby
  const loadAISummary = useCallback(async (babyId: number) => {
    setAiSummaryLoading(true);
    try {
      const summaryData = await fetchAISummary(babyId);
      setAiSummary(summaryData);
    } catch (err) {
      console.error('Failed to load AI summary:', err);
    } finally {
      setAiSummaryLoading(false);
    }
  }, []);

  // Load schedule prediction for the baby
  const loadSchedulePrediction = useCallback(async (babyId: number) => {
    try {
      const predictionData = await fetchSchedulePrediction(babyId);
      setSchedulePrediction(predictionData);
    } catch (err) {
      console.error('Failed to load schedule prediction:', err);
    }
  }, []);

  // Handle parent intervention
  const handleIntervention = async () => {
    const babyId = user?.baby?.id;
    if (!babyId || interventionLoading) return;

    setInterventionLoading(true);
    try {
      const action = isSleeping ? 'mark_awake' : 'mark_asleep';
      const response = await submitIntervention(babyId, action);
      
      // Update local state
      setIsSleeping(response.status === 'sleeping');
      setInCooldown(true);
      setCooldownRemaining(response.cooldown_minutes);
    } catch (err) {
      console.error('Failed to submit intervention:', err);
    } finally {
      setInterventionLoading(false);
    }
  };

  // Load data when baby_id is available
  useEffect(() => {
    const babyId = user?.baby_id || user?.baby?.id;
    if (babyId) {
      loadData(babyId);
      loadSleepStatus(babyId);
      loadOptimalStats(babyId);
      loadInsights(babyId);
      loadAISummary(babyId);
      loadSchedulePrediction(babyId);
    }
  }, [user?.baby_id, user?.baby?.id, loadData, loadSleepStatus, loadOptimalStats, loadInsights, loadAISummary, loadSchedulePrediction]);

  const handleMetricClick = (metric: MetricType) => {
    if (openMetric === metric) {
      setOpenMetric(null); // Close if clicking the same card
    } else {
      setOpenMetric(metric); // Open the clicked card
    }
  };

  const getMetricInfo = (metric: MetricType): string => {
    const hasOptimalData = optimalStats?.has_data ?? false;
    
    switch (metric) {
      case 'temp':
        if (hasOptimalData && optimalStats?.temperature !== null) {
          return `Most of ${babyName}'s longest naps happened at around ${optimalStats!.temperature.toFixed(0)}°C. Try keeping the room at this temperature for better sleep.`;
        }
        return `We're still learning ${babyName}'s preferences. Keep tracking sleep to see optimal temperature recommendations!`;
      case 'soon':
        return `Exciting updates are on the way! The next version of Nappi will feature new advanced sensors, giving you even deeper insights in ${babyName}'s sleep environment.`;
      case 'humidity':
        if (hasOptimalData && optimalStats?.humidity !== null) {
          return `${babyName} sleeps best at around ${optimalStats!.humidity.toFixed(0)}% humidity. Consider using a humidifier to maintain this level.`;
        }
        return `We're still learning ${babyName}'s preferences. Keep tracking sleep to see optimal humidity recommendations!`;
      case 'noise':
        if (hasOptimalData && optimalStats?.noise !== null) {
          return `${babyName} sleeps best with noise levels around ${optimalStats!.noise.toFixed(0)} dB. White noise machines can help maintain consistent levels.`;
        }
        return `We're still learning ${babyName}'s preferences. Keep tracking sleep to see optimal noise level recommendations!`;
      default:
        return '';
    }
  };

  // Get baby name from user data or fallback to sleep summary
  const babyName = user?.baby?.first_name || sleepSummary?.baby_name || 'Baby';
  const babyAge = user?.baby?.birthdate ? calculateAge(user.baby.birthdate) : null;

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        {showSpinner && (
          <div className="text-center flex flex-col items-center justify-center fade-in">
            <img
              src="/logo.svg"
              alt="Loading..."
              className="w-24 h-24 mb-6"
              style={{
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <p className="text-gray-600 font-[Kodchasan]">Loading dashboard...</p>
          </div>
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
          .fade-in {
            animation: fadeIn 0.3s ease-in;
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg max-w-md">
          <div className="text-5xl mb-4">
            <img src="/logo.svg" alt="Loading..." className="w-24 h-24 mx-auto"></img>
          </div>
          <p className="text-red-600 mb-4 font-medium">{error}</p>
          <button
            onClick={() => {
              const babyId = user?.baby_id || user?.baby?.id;
              if (babyId) loadData(babyId);
            }}
            className="bg-[#ffc857] hover:bg-[#ffb83d] text-black font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header Section */}
      <section className="pt-6 px-5 pb-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="cursor-pointer rounded-full hover:bg-gray-50 transition-colors" onClick={() => setMenuOpen(true)}>
              <img className="[border:none] p-0 bg-[transparent] w-12 h-[37px] relative" alt="Menu" src="/hugeicons-menu-02.svg" />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold font-[Kodchasan] text-[#000] m-0">{getGreeting()}</h1>
            <p className="text-sm font-[Kodchasan] text-gray-600 m-0">
              {user?.first_name 
                ? `${user.first_name} ${user.last_name || ''}`.trim() 
                : user?.username || 'there'}
            </p>
          </div>

          <img src="/logo.svg" alt="Nappi" className="w-12 h-12" />
        </div>

        {/* Baby Profile Card */}
        <div className="flex items-center justify-center gap-4">
          <img src="/baby.png" alt={`${babyName}'s profile`} className="w-20 h-20 rounded-full shadow-md object-cover" />
          <div>
            <h2 className="text-xl font-semibold font-[Kodchasan] text-[#000] m-0">Baby {babyName}</h2>
            {babyAge && (
              <p className="text-sm text-gray-600 m-0 mt-1">
                Age: {babyAge} old
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-5 pb-8 relative z-10">
        <div className="flex flex-col gap-5">
          {/* Last Nap Info */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#000] m-0 font-kodchasan">Last Nap Info</h3>
            </div>

            <div className="rounded-2xl p-4">
              <div className="flex flex-col gap-3">
                <InfoRow 
                  icon={<img src="/napTime-icon.svg" alt="Nap" className="w-5 h-5" />} 
                  label="Nap Time" 
                  value={sleepSummary ? `${formatTime(sleepSummary.started_at)} - ${formatTime(sleepSummary.ended_at)}` : '--:-- - --:--'} 
                />
                <InfoRow
                  icon={<img src="/iconoir-temperature-low.svg" alt="Temp" className="w-5 h-5" />}
                  label="Average Temperature"
                  value={sleepSummary?.avg_temperature != null ? `${sleepSummary.avg_temperature.toFixed(0)}°C` : '--'}
                />
                <InfoRow
                  icon={<img src="/cbi-moisture.svg" alt="Humidity" className="w-5 h-5" />}
                  label="Average Humidity"
                  value={sleepSummary?.avg_humidity != null ? `${sleepSummary.avg_humidity.toFixed(0)}%` : '--'}
                />
                <InfoRow
                  icon={<img src="/sound-icon.svg" alt="Sound" className="w-5 h-5" />}
                  label="Max Noise Level"
                  value={sleepSummary?.max_noise != null ? `${sleepSummary.max_noise.toFixed(0)} dB` : '--'}
                />
              </div>
            </div>
          </div>

          {/* Sleep Status - Parent Intervention */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="px-3 h-12 rounded-xl bg-[#E8F7F6] flex items-center justify-center whitespace-nowrap">
                  {isSleeping ? (
                    <span className="text-xs font-semibold text-[#2F8F8B]">Sleeping</span>
                  ) : (
                    <span className="text-xs font-semibold text-[#2F8F8B]">Awake</span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#000] m-0 font-[Kodchasan]">Sleep Status</h3>
                  <p className="text-sm text-gray-500 m-0">
                    {isSleeping ? 'Currently sleeping' : 'Currently awake'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleIntervention}
                disabled={interventionLoading}
                className={`px-4 py-2.5 rounded-xl font-medium font-[Kodchasan] text-sm transition-all active:scale-95 ${
                  interventionLoading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : isSleeping
                    ? 'bg-[#FFE5E5] text-[#E57373] hover:bg-[#FFD0D0]'
                    : 'bg-[#E8F7F6] text-[#5DCCCC] hover:bg-[#D5F0EF]'
                }`}
              >
                {interventionLoading ? 'Updating...' : isSleeping ? 'Mark Awake' : 'Mark Asleep'}
              </button>
            </div>
            {inCooldown && (
              <p className="text-xs text-gray-400 mt-3 m-0">
                Sensor detection is paused. Manual override is active.
              </p>
            )}
          </div>

          {/* Sleep Preferences */}
          <div className="h-fit">
            <div className="flex items-start py-0 px-[18px] mb-4">
              <h3 className="text-lg font-semibold text-[#000] m-0 font-kodchasan">{babyName} sleeps best in</h3>
            </div>

            <div className="flex items-center justify-start md:justify-center gap-4 overflow-x-auto overflow-y-hidden whitespace-nowrap font-[Kodchasan] pb-4 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <MetricCard
                icon={<img src="/temp-icon.svg" alt="Temp" className="w-[38px]" />}
                label="Temperture"
                symbol="+"
                isOpen={openMetric === 'temp'}
                onClick={() => handleMetricClick('temp')}
              />
              <MetricCard
                icon={<img src="/cbi-moisture1.svg" alt="Humidity" className="w-[38px]" />}
                label="Humidity"
                symbol="+"
                isOpen={openMetric === 'humidity'}
                onClick={() => handleMetricClick('humidity')}
              />
              <MetricCard
                icon={<img src="/sound-icon1.svg" alt="Noise" className="w-[38px]" />}
                label="Noise level"
                symbol="+"
                isOpen={openMetric === 'noise'}
                onClick={() => handleMetricClick('noise')}
              />
              <MetricCard
                icon={<img src="/star.svg" alt="star" className="w-[38px]" />}
                label="Coming Soon"
                symbol="+"
                isOpen={openMetric === 'soon'}
                onClick={() => handleMetricClick('soon')}
              />
            </div>

            {openMetric && (
              <div
                className="bg-white h-[86px] rounded-[20px] overflow-hidden shrink-0 flex items-center justify-center py-4 px-[19px] box-border "
                style={{
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                <p className="text-sm text-gray-700 m-0 leading-relaxed">{getMetricInfo(openMetric)}</p>
              </div>
            )}
          </div>

          {/* Room Status */}
          {roomMetrics && (roomMetrics.temperature_c != null || roomMetrics.humidity_percent != null || roomMetrics.noise_db != null) && (
            <div className="">
              <h3 className="text-lg font-semibold text-[#000] mb-4 font-kodchasan">Room Status</h3>

              <div className="grid grid-cols-2 gap-3">
                <StatusCard
                  icon={<img src="/temp-icon.svg" alt="Temp" className="w-[38px]" />}
                  label="Temperature"
                  value={roomMetrics.temperature_c != null ? `${roomMetrics.temperature_c.toFixed(1)}°C` : '--'}
                  color="#FF6B6B"
                  status={roomMetrics.temperature_c != null ? (roomMetrics.temperature_c > TEMP_ALERT_HIGH_C ? 'high' : roomMetrics.temperature_c < TEMP_ALERT_LOW_C ? 'low' : 'normal') : 'normal'}
                />
                <StatusCard
                  icon={<img src="/cbi-moisture1.svg" alt="Humidity" className="w-[38px]" />}
                  label="Humidity"
                  value={roomMetrics.humidity_percent != null ? `${roomMetrics.humidity_percent.toFixed(0)}%` : '--'}
                  color="#4ECDC4"
                  status="normal"
                />
                <StatusCard
                  icon={<img src="/sound-icon1.svg" alt="Noise" className="w-[38px]" />}
                  label="Noise"
                  value={roomMetrics.noise_db != null ? `${roomMetrics.noise_db.toFixed(0)} dB` : '--'}
                  color="#95E1D3"
                  status={roomMetrics.noise_db != null && roomMetrics.noise_db > NOISE_ALERT_HIGH_DB ? 'high' : 'normal'}
                />
              </div>

              {roomMetrics.notes && (
                <p className="text-xs text-amber-500 mt-3 text-center m-0">{roomMetrics.notes}</p>
              )}
              {roomMetrics.measured_at && (
                <p className="text-xs text-gray-400 mt-1 text-center m-0">Last updated: {new Date(roomMetrics.measured_at).toLocaleTimeString()}</p>
              )}
            </div>
          )}

          {/* AI-Powered Insights Section */}
          <div className="bg-gradient-to-br from-[#E8F7F6] to-[#D5F0EF] rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2F8F8B] font-kodchasan flex items-center gap-2">
                Nappi AI Insights
              </h3>
              {aiSummaryLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#4ECDC4]"></div>
              )}
            </div>

            {aiSummary ? (
              <div className="space-y-4">
                {/* Sleep Quality Summary */}
                <div className="bg-white/80 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-800">Sleep Summary</span>
                  </div>
                  <p className="text-sm text-gray-700">{aiSummary.sleep_summary.message}</p>
                  {aiSummary.weekly_trend && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        aiSummary.weekly_trend === 'improving' 
                          ? 'bg-green-100 text-green-700' 
                          : aiSummary.weekly_trend === 'declining'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {aiSummary.weekly_trend === 'improving' ? '↑ Improving' : 
                         aiSummary.weekly_trend === 'declining' ? '↓ Needs attention' : '→ Stable'}
                      </span>
                      {aiSummary.trend_message && (
                        <span className="text-xs text-gray-500">{aiSummary.trend_message}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Environment Status */}
                <div className={`rounded-2xl p-4 ${
                  aiSummary.environment.status === 'optimal' 
                    ? 'bg-green-50' 
                    : aiSummary.environment.status === 'needs_attention'
                    ? 'bg-orange-50'
                    : 'bg-white/80'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-800">Room Environment</span>
                    {aiSummary.environment.status === 'optimal' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Optimal</span>
                    )}
                    {aiSummary.environment.status === 'needs_attention' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Check</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{aiSummary.environment.message}</p>
                </div>

                {/* Next Sleep Prediction */}
                {aiSummary.next_sleep_prediction && (
                  <div className="bg-white/80 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-800">Next Sleep</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {aiSummary.next_sleep_prediction}
                      {aiSummary.next_sleep_time && (
                        <span className="font-semibold"> ({aiSummary.next_sleep_time})</span>
                      )}
                    </p>
                    {schedulePrediction?.suggestions && schedulePrediction.suggestions.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{schedulePrediction.suggestions[0]}</p>
                    )}
                  </div>
                )}

                {/* Today's Tips & Quick Insights */}
                <div className="bg-[#FEF3C7] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-[#92400E]">Today's Tips</span>
                  </div>
                  {aiSummary.quick_insights && aiSummary.quick_insights.length > 0 ? (
                    <div className="space-y-2">
                      {aiSummary.quick_insights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-[#78350F]">
                          <span className="text-[#92400E] mt-0.5">•</span>
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#78350F]">{aiSummary.todays_tip}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Fallback to simple insights */}
                <p className="text-sm text-gray-700 leading-relaxed">
                  {insights?.insights ? (
                    insights.insights
                  ) : (
                    <>
                      Keep tracking {babyName}&apos;s sleep to receive personalized AI-powered recommendations!
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 py-2">
    <span className="flex items-center justify-center w-6 h-6">{icon}</span>
    <span className="text-sm text-gray-600 flex-1">{label}</span>
    <span className="text-sm text-[#000] font-semibold">{value}</span>
  </div>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  symbol: string;
  isOpen: boolean;
  onClick: () => void;
}> = ({ icon, label, symbol, isOpen, onClick }) => (
  <div
    onClick={onClick}
    className={`relative h-[115.8px] rounded-[42.7px] bg-white shrink-0 flex flex-col items-center pt-[9px] px-[23px] pb-[8.4px] box-border gap-[12.2px] cursor-pointer transition-all hover:shadow-lg ${
      isOpen ? 'shadow-lg overflow-visible z-10' : 'overflow-hidden'
    }`}
  >
    <div className="flex items-start justify-center">{icon}</div>
    <div
      className={`h-[30px] relative leading-[91%] font-semibold text-base font-[Kodchasan] flex items-center justify-center ${
        label.includes('level') ? 'whitespace-pre-line text-center' : ''
      }`}
    >
      {label}
    </div>
    <div className="flex items-center justify-center">
      <div className="h-3.5 relative leading-[89%] font-semibold text-base font-[Kodchasan]">{isOpen ? '−' : symbol}</div>
    </div>

    {isOpen && (
      <img
        src="/open-box-nack.svg"
        alt=""
        className="absolute left-1/2 -translate-x-1/2 w-[109px] max-w-none pointer-events-none"
        style={{
          bottom: '-30px',
          zIndex: 20,
          marginLeft: '25px',
        }}
      />
    )}
  </div>
);

const StatusCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  status: 'normal' | 'high' | 'low';
}> = ({ icon, label, value, color, status }) => (
  <div className={`rounded-3xl p-5 shadow-lg ${status === 'high' ? 'bg-red-50' : status === 'low' ? 'bg-gray-50' : 'bg-white/90'}`} style={{ borderLeftColor: color }}>
    <div className="text-3xl mb-2">{icon}</div>
    <div className="text-xs text-gray-600 mb-1">{label}</div>
    <div className="text-xl font-bold text-gray-800">{value}</div>
    {status !== 'normal' && (
      <div className={`text-xs font-medium mt-1 ${status === 'high' ? 'text-red-600' : 'text-blue-600'}`}>{status === 'high' ? 'Too high' : 'Too low'}</div>
    )}
  </div>
);

export default HomeDashboard;
