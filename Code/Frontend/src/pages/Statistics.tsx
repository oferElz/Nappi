import React, { useEffect, useState, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { AuthUser } from '../types/auth';
import type { SensorDataPoint, DailySleepPoint, SleepPattern, InsightsResponse, TrendsResponse, EnhancedInsightsResponse } from '../types/metrics';
import { useLayoutContext } from '../components/LayoutContext';
import { getSession } from '../utils/session';
import { fetchSensorStats, fetchDailySleep, fetchSleepPatterns, fetchInsights, fetchTrends, fetchEnhancedInsights } from '../api/stats';
import { STATS_MAX_RANGE_DAYS, SENSOR_DEFAULT_RANGE_DAYS, AWAKENING_DEFAULT_RANGE_DAYS, SLEEP_EXCELLENT_THRESHOLD_HOURS, SLEEP_GOOD_THRESHOLD_HOURS, SLEEP_CHART_Y_MAX_HOURS } from '../constants';

interface LocalSleepPattern {
  label: string;
  start: number;
  end: number;
  duration: number;
}

const Statistics: React.FC = () => {
  const { setMenuOpen } = useLayoutContext();
  const [user, setUser] = useState<AuthUser | null>(null);

  // Sensor graph state
  const [selectedSensor, setSelectedSensor] = useState<'temperature' | 'humidity' | 'noise'>('temperature');
  const [sensorDateRange, setSensorDateRange] = useState({
    start: new Date(Date.now() - SENSOR_DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Sleep duration graph state
  const [sleepDateRange, setSleepDateRange] = useState({
    start: new Date(Date.now() - SENSOR_DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const MAX_RANGE_DAYS = STATS_MAX_RANGE_DAYS;
  const today = new Date().toISOString().split('T')[0];

  const clampDateRange = (
    start: string,
    end: string,
    changed: 'start' | 'end'
  ): { start: string; end: string } => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > MAX_RANGE_DAYS) {
      if (changed === 'start') {
        const maxEnd = new Date(startDate.getTime() + MAX_RANGE_DAYS * 24 * 60 * 60 * 1000);
        const cappedEnd = maxEnd > new Date() ? new Date() : maxEnd;
        return { start, end: cappedEnd.toISOString().split('T')[0] };
      } else {
        const minStart = new Date(endDate.getTime() - MAX_RANGE_DAYS * 24 * 60 * 60 * 1000);
        return { start: minStart.toISOString().split('T')[0], end };
      }
    }
    if (diffDays < 0) {
      return changed === 'start' ? { start, end: start } : { start: end, end };
    }
    return { start, end };
  };

  // Sessions vs Awakenings date range (independent)
  const [awakeningsDateRange, setAwakeningsDateRange] = useState({
    start: new Date(Date.now() - AWAKENING_DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Sleep patterns month picker (YYYY-MM format for input[type=month])
  const [patternsMonthValue, setPatternsMonthValue] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  // API data states
  const [sensorData, setSensorData] = useState<SensorDataPoint[]>([]);
  const [sleepDurationData, setSleepDurationData] = useState<DailySleepPoint[]>([]);
  const [awakeningsData, setAwakeningsData] = useState<DailySleepPoint[]>([]);
  const [sleepPatterns, setSleepPatterns] = useState<LocalSleepPattern[]>([]);

  // Loading states
  const [sensorLoading, setSensorLoading] = useState(false);
  const [sleepLoading, setSleepLoading] = useState(false);
  const [awakeningsLoading, setAwakeningsLoading] = useState(false);
  const [patternsLoading, setPatternsLoading] = useState(false);

  // Error states
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [sleepError, setSleepError] = useState<string | null>(null);
  const [awakeningsError, setAwakeningsError] = useState<string | null>(null);
  const [patternsError, setPatternsError] = useState<string | null>(null);

  // AI Insights state
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [, setInsightsLoading] = useState(false);
  const [, setInsightsError] = useState<string | null>(null);

  // Enhanced AI Analysis state
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [enhancedInsights, setEnhancedInsights] = useState<EnhancedInsightsResponse | null>(null);
  const [enhancedInsightsLoading, setEnhancedInsightsLoading] = useState(false);

  useEffect(() => {
    const stored = getSession();
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const babyId = user?.baby_id;
  const babyName = user?.baby?.first_name || 'Baby';

  // Helper to convert time string "HH:MM" to decimal hours
  const timeToDecimal = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  // Fetch sensor data when parameters change
  const loadSensorData = useCallback(async () => {
    if (!babyId) {
      console.warn('No baby_id available, skipping sensor data fetch');
      setSensorError('Please log in to view statistics');
      return;
    }

    setSensorLoading(true);
    setSensorError(null);

    try {
      console.log(`Fetching sensor data for baby ${babyId}: ${selectedSensor} from ${sensorDateRange.start} to ${sensorDateRange.end}`);
      const response = await fetchSensorStats(
        babyId,
        selectedSensor,
        sensorDateRange.start,
        sensorDateRange.end
      );
      console.log('Sensor data response:', response);
      setSensorData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch sensor data:', err);
      console.error('Error response:', err.response);
      const message = err.response?.data?.detail || 'Failed to load sensor data';
      setSensorError(typeof message === 'string' ? message : 'Failed to load sensor data');
      setSensorData([]);
    } finally {
      setSensorLoading(false);
    }
  }, [babyId, selectedSensor, sensorDateRange.start, sensorDateRange.end]);

  // Fetch sleep duration data when parameters change
  const loadSleepData = useCallback(async () => {
    if (!babyId) return;

    setSleepLoading(true);
    setSleepError(null);

    try {
      const response = await fetchDailySleep(
        babyId,
        sleepDateRange.start,
        sleepDateRange.end
      );
      setSleepDurationData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch sleep data:', err);
      const message = err.response?.data?.detail || 'Failed to load sleep data';
      setSleepError(typeof message === 'string' ? message : 'Failed to load sleep data');
      setSleepDurationData([]);
    } finally {
      setSleepLoading(false);
    }
  }, [babyId, sleepDateRange.start, sleepDateRange.end]);

  // Fetch sessions vs awakenings data (independent date range)
  const loadAwakeningsData = useCallback(async () => {
    if (!babyId) return;

    setAwakeningsLoading(true);
    setAwakeningsError(null);

    try {
      const response = await fetchDailySleep(
        babyId,
        awakeningsDateRange.start,
        awakeningsDateRange.end
      );
      setAwakeningsData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch awakenings data:', err);
      const message = err.response?.data?.detail || 'Failed to load awakenings data';
      setAwakeningsError(typeof message === 'string' ? message : 'Failed to load awakenings data');
      setAwakeningsData([]);
    } finally {
      setAwakeningsLoading(false);
    }
  }, [babyId, awakeningsDateRange.start, awakeningsDateRange.end]);

  // Fetch sleep patterns for selected month
  const loadPatternsData = useCallback(async () => {
    if (!babyId) return;

    setPatternsLoading(true);
    setPatternsError(null);

    try {
      const [yearStr, monthStr] = patternsMonthValue.split('-');
      const response = await fetchSleepPatterns(babyId, Number(monthStr), Number(yearStr));

      // Transform API patterns to local format for the chart
      const transformed: LocalSleepPattern[] = response.patterns.map((p: SleepPattern) => {
        const startDecimal = timeToDecimal(p.avg_start);
        let endDecimal = timeToDecimal(p.avg_end);

        // Handle overnight sleep (end time is next day)
        if (endDecimal < startDecimal) {
          endDecimal += 24;
        }

        return {
          label: p.label,
          start: startDecimal,
          end: endDecimal,
          // Keep chart arc length aligned with the displayed start/end window.
          // Some backend aggregates can have duration drift vs avg_start/avg_end.
          duration: endDecimal - startDecimal,
        };
      });

      setSleepPatterns(transformed);
    } catch (err: any) {
      console.error('Failed to fetch sleep patterns:', err);
      const message = err.response?.data?.detail || 'Failed to load sleep patterns';
      setPatternsError(typeof message === 'string' ? message : 'Failed to load sleep patterns');
      setSleepPatterns([]);
    } finally {
      setPatternsLoading(false);
    }
  }, [babyId, patternsMonthValue]);

  // Fetch AI insights
  const loadInsights = useCallback(async () => {
    if (!babyId) return;

    setInsightsLoading(true);
    setInsightsError(null);

    try {
      const response = await fetchInsights(babyId);
      setInsights(response);
    } catch (err: any) {
      console.error('Failed to fetch insights:', err);
      const message = err.response?.data?.detail || 'No insights available yet';
      setInsightsError(typeof message === 'string' ? message : 'Failed to load insights');
      setInsights(null);
    } finally {
      setInsightsLoading(false);
    }
  }, [babyId]);

  // Fetch trend analysis
  const loadTrends = useCallback(async () => {
    if (!babyId) return;

    setTrendsLoading(true);
    try {
      const response = await fetchTrends(babyId);
      setTrends(response);
    } catch (err: any) {
      console.error('Failed to fetch trends:', err);
      setTrends(null);
    } finally {
      setTrendsLoading(false);
    }
  }, [babyId]);

  // Fetch enhanced insights
  const loadEnhancedInsights = useCallback(async () => {
    if (!babyId) return;

    setEnhancedInsightsLoading(true);
    try {
      const response = await fetchEnhancedInsights(babyId);
      setEnhancedInsights(response);
    } catch (err: any) {
      console.error('Failed to fetch enhanced insights:', err);
      setEnhancedInsights(null);
    } finally {
      setEnhancedInsightsLoading(false);
    }
  }, [babyId]);

  // Load data when baby ID is available
  useEffect(() => {
    if (babyId) {
      loadSensorData();
    }
  }, [babyId, loadSensorData]);

  useEffect(() => {
    if (babyId) {
      loadSleepData();
    }
  }, [babyId, loadSleepData]);

  useEffect(() => {
    if (babyId) {
      loadAwakeningsData();
    }
  }, [babyId, loadAwakeningsData]);

  useEffect(() => {
    if (babyId) {
      loadPatternsData();
    }
  }, [babyId, loadPatternsData]);

  useEffect(() => {
    if (babyId) {
      loadInsights();
      loadTrends();
      loadEnhancedInsights();
    }
  }, [babyId, loadInsights, loadTrends, loadEnhancedInsights]);

  // Sensor chart options
  const getSensorUnit = () => {
    const units = { temperature: '°C', humidity: '%', noise: 'dB' };
    return units[selectedSensor];
  };

  const sensorChartOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = params[0];
          return `${point.name}<br/>${point.seriesName}: ${point.value}${getSensorUnit()}`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: sensorData.map((d) => d.date), boundaryGap: false },
      yAxis: {
        type: 'value',
        name: getSensorUnit(),
        axisLabel: { formatter: `{value}${getSensorUnit()}` },
      },
      series: [
        {
          name: selectedSensor.charAt(0).toUpperCase() + selectedSensor.slice(1),
          type: 'line',
          smooth: true,
          data: sensorData.map((d) => d.value),
          lineStyle: {
            width: 3,
            color: selectedSensor === 'temperature' ? '#F59E0B' : selectedSensor === 'humidity' ? '#3B82F6' : '#10B981',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color:
                    selectedSensor === 'temperature'
                      ? 'rgba(245, 158, 11, 0.3)'
                      : selectedSensor === 'humidity'
                        ? 'rgba(59, 130, 246, 0.3)'
                        : 'rgba(16, 185, 129, 0.3)',
                },
                {
                  offset: 1,
                  color:
                    selectedSensor === 'temperature'
                      ? 'rgba(245, 158, 11, 0.05)'
                      : selectedSensor === 'humidity'
                        ? 'rgba(59, 130, 246, 0.05)'
                        : 'rgba(16, 185, 129, 0.05)',
                },
              ],
            },
          },
          itemStyle: {
            color: selectedSensor === 'temperature' ? '#F59E0B' : selectedSensor === 'humidity' ? '#3B82F6' : '#10B981',
          },
        },
      ],
    }),
    [sensorData, selectedSensor]
  );

  // Sleep duration chart options
  const sleepDurationOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = params[0];
          const data = sleepDurationData[point.dataIndex];
          return `${point.name}<br/>Total Sleep: ${point.value}h<br/>Sessions: ${data?.sessions_count || 0}`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: sleepDurationData.map((d) => d.date), axisTick: { alignWithLabel: true } },
      yAxis: { type: 'value', name: 'Hours', min: 0, max: SLEEP_CHART_Y_MAX_HOURS },
      series: [
        {
          name: 'Sleep Duration',
          type: 'bar',
          barWidth: '60%',
          data: sleepDurationData.map((d) => ({
            value: d.total_hours,
            itemStyle: { color: d.total_hours >= SLEEP_EXCELLENT_THRESHOLD_HOURS ? '#10B981' : d.total_hours >= SLEEP_GOOD_THRESHOLD_HOURS ? '#6366F1' : '#F59E0B' },
          })),
          label: { show: false },
        },
      ],
    }),
    [sleepDurationData]
  );

  // Awakenings per session trend chart options (single line — lower = better)
  const sessionsVsAwakeningsOptions = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = params[0];
          const data = awakeningsData[point.dataIndex];
          const ratio = point.value;
          return `${point.name}<br/>Awakenings per session: ${ratio}<br/>Sessions: ${data?.sessions_count || 0}<br/>Awakenings: ${data?.awakenings_count || 0}`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: awakeningsData.map((d) => d.date), boundaryGap: false },
      yAxis: {
        type: 'value',
        name: 'Per session',
        min: 0,
      },
      series: [
        {
          name: 'Awakenings per Session',
          type: 'line',
          smooth: true,
          data: awakeningsData.map((d) =>
            d.sessions_count > 0 ? Math.round((d.awakenings_count / d.sessions_count) * 10) / 10 : 0
          ),
          lineStyle: { width: 3, color: '#F59E0B' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
              ],
            },
          },
          itemStyle: { color: '#F59E0B' },
        },
      ],
    }),
    [awakeningsData]
  );

  // Process sleep patterns for polar chart
  const processedSleepPatterns = useMemo(() => {
    return sleepPatterns.flatMap((p, idx) => {
      const crossesMidnight = p.end > 24;

      if (crossesMidnight) {
        const endFirst = 24;
        const endSecond = p.end - 24;

        return [
          {
            ...p,
            start: p.start,
            end: endFirst,
            duration: endFirst - p.start,
            segmentId: `${p.label}-1`,
            parentLabel: p.label,
            parentIndex: idx,
          },
          {
            ...p,
            start: 0,
            end: endSecond,
            duration: endSecond,
            segmentId: `${p.label}-2`,
            parentLabel: p.label,
            parentIndex: idx,
          },
        ];
      }
      return {
        ...p,
        segmentId: p.label,
        parentLabel: p.label,
        parentIndex: idx,
      };
    });
  }, [sleepPatterns]);

  const PATTERN_PALETTE = ['#FCD34D', '#60A5FA', '#34D399', '#F472B6', '#A78BFA', '#FB923C', '#818CF8', '#38BDF8'];

  // Sleep patterns chart options — uses custom series (canvas drawing) for precise hover detection
  const sleepPatternsOptions = useMemo(
    () => {
      const formatTime = (hour: number) => {
        const h = Math.floor(hour) % 24;
        const m = Math.round((hour % 1) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      // Build contiguous 24h timeline: transparent gaps + colored sleep segments.
      // This avoids multi-series stacking edge cases where some segments could disappear.
      const segments = processedSleepPatterns
        .map((pattern) => {
          const originalPattern = sleepPatterns[pattern.parentIndex];
          return {
            start: Math.max(0, Math.min(24, pattern.start)),
            end: Math.max(0, Math.min(24, pattern.end)),
            color: PATTERN_PALETTE[pattern.parentIndex % PATTERN_PALETTE.length],
            originalPattern,
          };
        })
        .filter((seg) => seg.end > seg.start)
        .sort((a, b) => a.start - b.start);

      type TimelineItem = {
        duration: number;
        color: string;
        transparent: boolean;
        originalPattern?: LocalSleepPattern;
      };

      const timeline: TimelineItem[] = [];
      let cursor = 0;

      for (const seg of segments) {
        const effectiveStart = Math.max(seg.start, cursor);
        const effectiveEnd = Math.max(seg.end, effectiveStart);

        if (effectiveStart > cursor) {
          timeline.push({
            duration: effectiveStart - cursor,
            color: 'transparent',
            transparent: true,
          });
        }

        if (effectiveEnd > effectiveStart) {
          timeline.push({
            duration: effectiveEnd - effectiveStart,
            color: seg.color,
            transparent: false,
            originalPattern: seg.originalPattern,
          });
        }

        cursor = Math.max(cursor, effectiveEnd);
      }

      if (cursor < 24) {
        timeline.push({
          duration: 24 - cursor,
          color: 'transparent',
          transparent: true,
        });
      }

      return {
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            const item = params.data;
            if (!item?.originalPattern) return '';
            const op = item.originalPattern as LocalSleepPattern;
            return `<b>${op.label}</b><br/>${formatTime(op.start)} - ${formatTime(op.end > 24 ? op.end - 24 : op.end)}<br/>Duration: ${op.duration.toFixed(1)}h`;
          },
        },
        angleAxis: {
          type: 'value',
          min: 0,
          max: 24,
          startAngle: 90,
          clockwise: true,
          splitLine: { show: true, lineStyle: { color: '#E5E7EB', type: 'dashed' } },
          axisLabel: {
            formatter: (value: number) =>
              [0, 6, 12, 18].includes(value)
                ? `${value.toString().padStart(2, '0')}:00`
                : '',
          },
        },
        radiusAxis: { type: 'category', data: ['Sleep'], show: false },
        polar: { radius: '58%' },
        series: [
          {
            type: 'pie',
            center: ['50%', '50%'],
            radius: ['42%', '58%'],
            startAngle: 90,
            clockwise: true,
            avoidLabelOverlap: true,
            label: { show: false },
            labelLine: { show: false },
            data: timeline.map((item) => ({
              value: item.duration,
              itemStyle: item.transparent
                ? {
                    color: 'transparent',
                    borderColor: 'transparent',
                    borderWidth: 0,
                  }
                : {
                    color: item.color,
                    borderColor: '#fff',
                    borderWidth: 2,
                  },
              originalPattern: item.originalPattern,
            })),
          },
        ],
      };
    },
    [processedSleepPatterns, sleepPatterns]
  );

  // Generate dynamic legend based on actual patterns
  const patternLegendItems = useMemo(() => {
    return sleepPatterns.map((p, i) => {
      const color = PATTERN_PALETTE[i % PATTERN_PALETTE.length];

      const formatTime = (hour: number) => {
        const h = Math.floor(hour) % 24;
        const m = Math.round((hour % 1) * 60);
        const period = h >= 12 ? 'PM' : 'AM';
        const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
      };

      const startTime = formatTime(p.start);
      const endTime = formatTime(p.end > 24 ? p.end - 24 : p.end);

      return { color, label: `${p.label} (${startTime}-${endTime})` };
    });
  }, [sleepPatterns]);

  // Loading component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-[250px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4ECDC4]"></div>
    </div>
  );

  // Error component
  const ErrorMessage = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div className="flex flex-col items-center justify-center h-[250px] text-center">
      <p className="text-red-500 mb-3 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-[#4ECDC4] text-white rounded-lg text-sm hover:bg-[#3dbdb5] transition-colors"
      >
        Retry
      </button>
    </div>
  );

  // No data component
  const NoData = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
      {message}
    </div>
  );

  return (
    <>
      {/* Header Section */}
      <section className="pt-6 px-5 pb-6 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="cursor-pointer rounded-full hover:bg-gray-50 transition-colors" onClick={() => setMenuOpen(true)}>
              <img className="w-12 h-[37px]" alt="Menu" src="/hugeicons-menu-02.svg" />
            </div>
          </div>

          <div className="text-center relative">
            <div className="flex flex-col items-center text-center relative">
              <img className="w-12 h-12" src="/streamline-graph-arrow-increase.svg" alt="" />
              <h1 className="text-2xl font-semibold font-[Kodchasan] text-[#000] m-0">Sleep Analytics</h1>
            </div>
            <p className="text-sm font-[Kodchasan] text-gray-600 m-0">{babyName}&apos;s patterns</p>
          </div>

          <img src="/logo.svg" alt="Nappi" className="w-12 h-12" />
        </div>
      </section>

      {/* Main Content */}
      <section className="px-5 pb-8 relative z-10">
        <div className="flex flex-col gap-5">
          {/* Sensor Data Over Time */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg">
            <div className="flex flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-[#000] font-kodchasan">Room Conditions</h3>
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedSensor}
                  onChange={(e) => setSelectedSensor(e.target.value as any)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]"
                >
                  <option value="temperature">Temperature</option>
                  <option value="humidity">Humidity</option>
                  <option value="noise">Noise</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center mb-4">
              <input
                type="date"
                value={sensorDateRange.start}
                max={sensorDateRange.end}
                onChange={(e) => setSensorDateRange((prev) => clampDateRange(e.target.value, prev.end, 'start'))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={sensorDateRange.end}
                min={sensorDateRange.start}
                max={today}
                onChange={(e) => setSensorDateRange((prev) => clampDateRange(prev.start, e.target.value, 'end'))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]"
              />
              <span className="text-xs text-gray-400">Max 3 months</span>
            </div>

            {sensorLoading ? (
              <LoadingSpinner />
            ) : sensorError ? (
              <ErrorMessage message={sensorError} onRetry={loadSensorData} />
            ) : sensorData.length === 0 ? (
              <NoData message="No sensor data available for this period" />
            ) : (
              <ReactECharts option={sensorChartOptions} style={{ height: '250px' }} notMerge={true} lazyUpdate={true} />
            )}
          </div>

          {/* Sleep Duration Chart */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-[#000] font-kodchasan">Daily Sleep Duration</h3>
            </div>

            <div className="flex flex-wrap gap-2 items-center mb-4">
              <input
                type="date"
                value={sleepDateRange.start}
                max={sleepDateRange.end}
                onChange={(e) => setSleepDateRange((prev) => clampDateRange(e.target.value, prev.end, 'start'))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={sleepDateRange.end}
                min={sleepDateRange.start}
                max={today}
                onChange={(e) => setSleepDateRange((prev) => clampDateRange(prev.start, e.target.value, 'end'))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]"
              />
              <span className="text-xs text-gray-400">Max 3 months</span>
            </div>

            {sleepLoading ? (
              <LoadingSpinner />
            ) : sleepError ? (
              <ErrorMessage message={sleepError} onRetry={loadSleepData} />
            ) : sleepDurationData.length === 0 ? (
              <NoData message="No sleep data available for this period" />
            ) : (
              <>
                <ReactECharts option={sleepDurationOptions} style={{ height: '250px' }} notMerge={true} lazyUpdate={true} />
                <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <LegendItem color="#10B981" label={`Excellent (${SLEEP_EXCELLENT_THRESHOLD_HOURS}+ hrs)`} />
                  <LegendItem color="#6366F1" label={`Good (${SLEEP_GOOD_THRESHOLD_HOURS}-${SLEEP_EXCELLENT_THRESHOLD_HOURS} hrs)`} />
                  <LegendItem color="#F59E0B" label={`Fair (<${SLEEP_GOOD_THRESHOLD_HOURS} hrs)`} />
                </div>
              </>
            )}
          </div>

          {/* Sessions vs Awakenings Trend */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-[#000] font-kodchasan">Awakenings per Session</h3>
            </div>

            <div className="flex flex-wrap gap-2 items-center mb-4">
              <input
                type="date"
                value={awakeningsDateRange.start}
                max={awakeningsDateRange.end}
                onChange={(e) => setAwakeningsDateRange((prev) => clampDateRange(e.target.value, prev.end, 'start'))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={awakeningsDateRange.end}
                min={awakeningsDateRange.start}
                max={today}
                onChange={(e) => setAwakeningsDateRange((prev) => clampDateRange(prev.start, e.target.value, 'end'))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]"
              />
              <span className="text-xs text-gray-400">Max 3 months</span>
            </div>

            <p className="text-xs text-gray-400 mb-3">Lower is better — fewer awakenings per sleep session</p>

            {awakeningsLoading ? (
              <LoadingSpinner />
            ) : awakeningsError ? (
              <ErrorMessage message={awakeningsError} onRetry={loadAwakeningsData} />
            ) : awakeningsData.length === 0 ? (
              <NoData message="No sleep data available for this period" />
            ) : (
              <>
                <ReactECharts option={sessionsVsAwakeningsOptions} style={{ height: '250px' }} notMerge={true} lazyUpdate={true} />
                <div className="flex justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <LegendItem color="#F59E0B" label="Awakenings per session" />
                </div>
              </>
            )}
          </div>

          {/* Sleep Patterns - 24 Hour Clock */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="text-lg font-semibold text-[#000] font-kodchasan">Typical Sleep Patterns (24-Hour Clock)</h3>
              <div className="flex gap-2 items-center">
                <select
                  value={patternsMonthValue.split('-')[1]}
                  onChange={(e) => setPatternsMonthValue(prev => `${prev.split('-')[0]}-${e.target.value}`)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]"
                >
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{m}</option>
                  ))}
                </select>
                <select
                  value={patternsMonthValue.split('-')[0]}
                  onChange={(e) => setPatternsMonthValue(prev => `${e.target.value}-${prev.split('-')[1]}`)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]"
                >
                  {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {patternsLoading ? (
              <LoadingSpinner />
            ) : patternsError ? (
              <ErrorMessage message={patternsError} onRetry={loadPatternsData} />
            ) : sleepPatterns.length === 0 ? (
              <NoData message="No sleep patterns detected yet" />
            ) : (
              <>
                <ReactECharts option={sleepPatternsOptions} style={{ height: '300px' }} notMerge={true} lazyUpdate={true} />
                <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  {patternLegendItems.map((item, index) => (
                    <LegendItem key={index} color={item.color} label={item.label} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* AI-Powered Analysis Section - Always Visible */}
          <div className="bg-gradient-to-br from-[#E8F7F6] to-[#D5F0EF] rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2F8F8B] font-kodchasan flex items-center gap-2">
                AI Sleep Analysis
              </h3>
              {(trendsLoading || enhancedInsightsLoading) && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#4ECDC4]"></div>
              )}
            </div>

            <div className="space-y-4">
              {/* Weekly Trend Summary */}
              {trends?.ai_insights ? (
                <div className="bg-white/80 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    Weekly Progress
                  </h4>
                  <p className="text-sm text-gray-700 mb-3">{trends.ai_insights.summary}</p>
                  
                  {/* Trend Stats */}
                  {trends.weekly && (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500">Avg Sleep</div>
                        <div className="text-lg font-semibold text-gray-800">{trends.weekly.avg_sleep_hours}h/day</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-xs text-gray-500">Consistency</div>
                        <div className="text-lg font-semibold text-gray-800">{trends.weekly.consistency_score}/100</div>
                      </div>
                    </div>
                  )}

                  {/* Trend Direction */}
                  {trends.weekly && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          trends.weekly.trend === 'improving' 
                            ? 'bg-green-100 text-green-700' 
                            : trends.weekly.trend === 'declining'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {trends.weekly.trend === 'improving' ? '↑ Improving' : 
                           trends.weekly.trend === 'declining' ? '↓ Needs attention' : '→ Stable'}
                          {' '}({trends.weekly.trend_percentage}%)
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 ml-1">Based on average daily sleep hours over the past 7 days</p>
                    </div>
                  )}

                  {/* Highlights */}
                  {trends.ai_insights.highlights.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-green-700 mb-1">Highlights</div>
                      {trends.ai_insights.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600 mb-1">
                          <span className="text-green-500">✓</span>
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Concerns */}
                  {trends.ai_insights.concerns.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-orange-700 mb-1">Areas to Watch</div>
                      {trends.ai_insights.concerns.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600 mb-1">
                          <span className="text-orange-500">!</span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Age Comparison */}
                  <div className="text-xs text-gray-500 italic mt-2">
                    {trends.ai_insights.age_comparison}
                  </div>
                </div>
              ) : sleepDurationData.length > 0 ? (
                <div className="bg-white/80 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Weekly Summary</h4>
                  <ul className="m-0 pl-4 text-gray-700 text-sm space-y-1">
                    {(() => {
                      const bestDay = sleepDurationData.reduce((best, curr) =>
                        curr.total_hours > best.total_hours ? curr : best
                      , sleepDurationData[0]);
                      const avgSleep = sleepDurationData.reduce((sum, d) => sum + d.total_hours, 0) / sleepDurationData.length;
                      return (
                        <>
                          <li>{babyName} slept best on <strong>{new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long' })}</strong> ({bestDay.total_hours.toFixed(1)}h)</li>
                          <li>Average: <strong>{avgSleep.toFixed(1)} hours/day</strong></li>
                        </>
                      );
                    })()}
                  </ul>
                </div>
              ) : null}

              {/* Enhanced Insights - Last Awakening Analysis */}
              {enhancedInsights?.insights ? (
                <div className="bg-white/80 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    Last Awakening Analysis
                  </h4>
                  
                  {/* Awakening Info */}
                  {enhancedInsights.awakened_at && (
                    <div className="text-xs text-gray-500 mb-3">
                      {new Date(enhancedInsights.awakened_at).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                      })} 
                      {enhancedInsights.sleep_duration_minutes && (
                        <span> | Slept {Math.floor(enhancedInsights.sleep_duration_minutes / 60)}h {Math.round(enhancedInsights.sleep_duration_minutes % 60)}m</span>
                      )}
                    </div>
                  )}

                  {/* Likely Cause */}
                  <div className="bg-[#FEF3C7] rounded-xl p-3 mb-3">
                    <div className="text-xs font-medium text-[#92400E] mb-1">Likely Cause</div>
                    <p className="text-sm text-[#78350F]">{enhancedInsights.insights.likely_cause}</p>
                  </div>

                  {/* Actionable Tips */}
                  {enhancedInsights.insights.actionable_tips.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-[#2F8F8B] mb-2">Tips to Try</div>
                      {enhancedInsights.insights.actionable_tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700 mb-2 bg-gray-50 rounded-lg p-2">
                          <span className="text-[#4ECDC4] font-bold">{i + 1}.</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Environment & Age Context */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 mb-1">Environment</div>
                      <p className="text-sm text-gray-700">{enhancedInsights.insights.environment_assessment}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 mb-1">Age Context</div>
                      <p className="text-sm text-gray-700">{enhancedInsights.insights.age_context}</p>
                    </div>
                  </div>

                  {/* Sleep Quality Note */}
                  <div className="mt-3 text-xs text-gray-500 italic">
                    {enhancedInsights.insights.sleep_quality_note}
                  </div>
                </div>
              ) : insights?.insights ? (
                <div className="bg-white/80 rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    AI Analysis
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{insights.insights}</p>
                </div>
              ) : null}

              {/* AI Recommendations from Trends */}
              {trends?.ai_insights?.recommendations && trends.ai_insights.recommendations.length > 0 && (
                <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-[#92400E] mb-2 flex items-center gap-2">
                    Recommendations
                  </h4>
                  {trends.ai_insights.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#78350F] mb-2">
                      <span>•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* No Data State */}
              {!trends && !enhancedInsights && !insights && (
                <div className="bg-white/80 rounded-2xl p-6 text-center">
                  <p className="text-gray-500 text-sm">
                    Keep tracking {babyName}&apos;s sleep to unlock AI-powered insights and recommendations!
                  </p>
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      </section>
    </>
  );
};

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
    <span className="text-xs text-gray-600">{label}</span>
  </div>
);

export default Statistics;
