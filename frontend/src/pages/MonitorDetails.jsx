import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import client from '../api/client';
import Navbar from '../components/Navbar';

// Clean light skeleton loader for sections
function SectionLoader() {
  return (
    <div className="animate-pulse space-y-4 bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm">
      <div className="h-5 bg-slate-100 rounded w-1/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-100 rounded"></div>
        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
        <div className="h-4 bg-slate-100 rounded w-2/3"></div>
      </div>
    </div>
  );
}

export default function MonitorDetails() {
  const { id } = useParams();

  // 1. Fetch monitor general details
  const { 
    data: monitorsData, 
    isLoading: isMonitorsLoading, 
    isError: isMonitorsError 
  } = useQuery({
    queryKey: ['monitors'],
    queryFn: async () => {
      const response = await client.get('/monitors');
      return response.data;
    },
  });

  // 2. Fetch latest status
  const { 
    data: statusData, 
    isLoading: isStatusLoading, 
    isError: isStatusError 
  } = useQuery({
    queryKey: ['monitor-status', id],
    queryFn: async () => {
      const response = await client.get(`/monitors/${id}/status`);
      return response.data; 
    },
  });

  // 3. Fetch metrics
  const { 
    data: metricsData, 
    isLoading: isMetricsLoading, 
    isError: isMetricsError 
  } = useQuery({
    queryKey: ['monitor-metrics', id],
    queryFn: async () => {
      const response = await client.get(`/monitors/${id}/metrics`);
      return response.data; 
    },
  });

  // 4. Fetch check history
  const { 
    data: checksData, 
    isLoading: isChecksLoading, 
    isError: isChecksError 
  } = useQuery({
    queryKey: ['monitor-checks', id],
    queryFn: async () => {
      const response = await client.get(`/monitors/${id}/checks`);
      return response.data; 
    },
  });

  // Find the current monitor from the list
  const monitor = monitorsData?.monitors?.find((m) => m.id === id);

  const checks = checksData?.checks || [];
  const hasChecks = checks.length > 0;

  // Process data for Response Time Trend Chart (oldest to newest, left-to-right)
  const trendData = [...checks].reverse().map(check => ({
    time: new Date(check.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    latency: check.response_time_ms,
    checkedAtFull: new Date(check.checked_at).toLocaleString(),
    status: check.status,
  }));

  // Process data for Status Distribution Chart
  const upCount = checks.filter(c => c.status === 'UP').length;
  const downCount = checks.filter(c => c.status === 'DOWN').length;
  const distributionData = [
    { name: 'UP', value: upCount },
    { name: 'DOWN', value: downCount },
  ].filter(item => item.value > 0);

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navigation & Header */}
        <div className="mb-6 flex justify-between items-center">
          <Link to="/" className="text-[#1e40af] hover:text-[#1d4ed8] text-sm font-semibold flex items-center gap-1">
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Section 1: Monitor Information */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#0f172a] tracking-tight">Monitor Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time stats and health check logs</p>
            </div>
            {monitor && (
              <span 
                className={monitor.is_active ? 'badge-active' : 'badge-inactive'}
              >
                {monitor.is_active ? 'Active' : 'Paused'}
              </span>
            )}
          </div>
          
          {isMonitorsLoading && (
            <div className="animate-pulse space-y-2 mt-4">
              <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            </div>
          )}
          
          {isMonitorsError && (
            <div className="bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] p-3 rounded-lg text-sm mt-4">
              Failed to load monitor details
            </div>
          )}
          
          {!isMonitorsLoading && !monitor && (
            <div className="bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] p-3 rounded-lg text-sm mt-4">
              Monitor not found
            </div>
          )}

          {monitor && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6 text-sm">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Name</span>
                <span className="text-[#0f172a] text-base font-bold tracking-tight">{monitor.name}</span>
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Target URL</span>
                <span className="text-slate-700 font-mono text-sm truncate block" title={monitor.url}>
                  {monitor.url}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Check Interval</span>
                <span className="text-slate-700 text-base font-semibold">
                  Every {monitor.interval_minutes} {monitor.interval_minutes === 1 ? 'minute' : 'minutes'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Grid for Section 2 (Latest Status) & Section 3 (Metrics) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Section 2: Latest Status Card */}
          {isStatusLoading ? (
            <SectionLoader />
          ) : isStatusError ? (
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 text-[#dc2626] text-sm shadow-sm">
              Failed to load status
            </div>
          ) : (
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#0f172a] mb-4 tracking-tight">Latest Status</h3>
              
              {!statusData || !statusData.check ? (
                <div className="text-slate-400 text-sm py-4 text-center">No checks recorded yet</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-medium text-slate-500">Current Status</span>
                    <span 
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                        statusData.check.status === 'UP' 
                          ? 'bg-[#15803d]/10 text-[#15803d] border-[#15803d]/20' 
                          : 'bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/20'
                      }`}
                    >
                      {statusData.check.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-medium text-slate-500">Response Time</span>
                    <span className="text-sm text-[#0f172a] font-bold">{statusData.check.response_time_ms} ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">Last Checked</span>
                    <span className="text-xs text-slate-500 font-mono truncate max-w-[150px]">
                      {formatTimestamp(statusData.check.checked_at)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Metrics Cards Grid */}
          {isMetricsLoading ? (
            <div className="md:col-span-2 animate-pulse space-y-4 bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm">
              <div className="h-5 bg-slate-100 rounded w-1/4"></div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded"></div>
                ))}
              </div>
            </div>
          ) : isMetricsError ? (
            <div className="md:col-span-2 bg-white border border-[#e2e8f0] rounded-xl p-6 text-[#dc2626] text-sm shadow-sm">
              Failed to load metrics
            </div>
          ) : (
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm md:col-span-2">
              <h3 className="text-base font-bold text-[#0f172a] mb-4 tracking-tight">Metrics</h3>
              
              {metricsData && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  
                  <div className="bg-slate-50/50 border border-[#e2e8f0] rounded-lg p-3 text-center flex flex-col justify-center shadow-inner">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-550 mb-1">Total Checks</span>
                    <span className="text-xl font-bold text-[#0f172a]">{metricsData.total_checks}</span>
                  </div>

                  <div className="bg-slate-50/50 border border-[#e2e8f0] rounded-lg p-3 text-center border-l-2 border-l-[#15803d] flex flex-col justify-center">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-550 mb-1">UP Checks</span>
                    <span className="text-xl font-bold text-[#15803d]">{metricsData.up_checks}</span>
                  </div>

                  <div className="bg-slate-50/50 border border-[#e2e8f0] rounded-lg p-3 text-center border-l-2 border-l-[#dc2626] flex flex-col justify-center">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-550 mb-1">DOWN Checks</span>
                    <span className="text-xl font-bold text-[#dc2626]">{metricsData.down_checks}</span>
                  </div>

                  <div className="bg-slate-50/50 border border-[#e2e8f0] rounded-lg p-3 text-center flex flex-col justify-center">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-550 mb-1">Uptime</span>
                    <span className="text-xl font-bold text-[#1e40af]">{metricsData.uptime_percentage}%</span>
                  </div>

                  <div className="bg-slate-50/50 border border-[#e2e8f0] rounded-lg p-3 text-center col-span-2 sm:col-span-1 flex flex-col justify-center">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-550 mb-1">Avg Response</span>
                    <span className="text-xl font-bold text-[#0f172a]">{metricsData.avg_response_time_ms}ms</span>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Charts Section */}
        {hasChecks && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Chart 1: Response Time Trend */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-base font-bold text-[#0f172a] mb-4 tracking-tight">Response Time Trend (ms)</h3>
              <div className="w-full h-[250px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      dx={-5}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}
                      labelStyle={{ color: '#64748b', fontWeight: 'bold', fontSize: 11 }}
                      itemStyle={{ color: '#1e40af', fontSize: 11 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="latency" 
                      name="Response Time" 
                      stroke="#1e40af" 
                      strokeWidth={2} 
                      dot={false} 
                      activeDot={{ r: 4 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Status Ratio */}
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#0f172a] mb-4 tracking-tight">Status Distribution</h3>
              <div className="w-full h-[220px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'UP' ? '#15803d' : '#dc2626'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                      itemStyle={{ color: '#0f172a', fontSize: 11 }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      iconSize={10}
                      iconType="circle" 
                      formatter={(value) => <span className="text-xs text-slate-500 font-semibold">{value}</span>} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* Section 4: Check History Table */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-[#0f172a] mb-4 tracking-tight">Check History</h3>

          {isChecksLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-full"></div>
              <div className="h-6 bg-slate-100 rounded w-full"></div>
              <div className="h-6 bg-slate-100 rounded w-full"></div>
            </div>
          ) : isChecksError ? (
            <div className="text-[#dc2626] text-sm">Failed to load history</div>
          ) : !hasChecks ? (
            <div className="text-slate-400 text-sm text-center py-8">No checks recorded yet</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-[10px] uppercase tracking-wider bg-slate-50 text-slate-500 border-b border-[#e2e8f0]">
                  <tr>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Code</th>
                    <th className="px-5 py-3 font-bold">Response Time</th>
                    <th className="px-5 py-3 font-bold">Checked At</th>
                    <th className="px-5 py-3 font-bold">Error Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]/60">
                  {checks.map((check, index) => {
                    const isUp = check.status === 'UP';
                    return (
                      <tr 
                        key={index} 
                        className={`odd:bg-white even:bg-slate-50/30 hover:bg-slate-50/60 transition-colors border-l-2 ${
                          isUp ? 'border-l-[#15803d]/70' : 'border-l-[#dc2626]/70'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <span 
                            className={isUp ? 'badge-up' : 'badge-down'}
                          >
                            {check.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          {check.status_code !== null ? check.status_code : '-'}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-700">
                          {check.response_time_ms} ms
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">
                          {formatTimestamp(check.checked_at)}
                        </td>
                        <td className="px-5 py-3 text-xs text-[#dc2626] font-mono max-w-xs truncate" title={check.error_message || ''}>
                          {check.error_message || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
