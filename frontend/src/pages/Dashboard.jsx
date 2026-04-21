import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Users, ShieldCheck, ShieldX, TrendingUp, Loader2, RefreshCw, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import DetectionCard from '../components/DetectionCard';
import { API_URL } from '../config';

const PIE_COLORS = ['#10b981', '#ef4444', '#eab308'];

const EMPTY_STATS = {
  total_scans: 0, total_faces: 0, total_mask: 0,
  total_no_mask: 0, total_uncertain: 0, compliance_rate: 0, trend: [],
};

const EMPTY_DETECTIONS = { items: [], total: 0, page: 1, pages: 1 };

export default function Dashboard() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [detections, setDetections] = useState(EMPTY_DETECTIONS);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  const fetchData = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, detectionsRes] = await Promise.all([
        fetch(`${API_URL}/api/stats`).catch(() => null),
        fetch(`${API_URL}/api/detections?page=${p}&limit=10`).catch(() => null),
      ]);

      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (detectionsRes && detectionsRes.ok) {
        const detectionsData = await detectionsRes.json();
        setDetections(detectionsData);
      }

      if ((!statsRes || !statsRes.ok) && (!detectionsRes || !detectionsRes.ok)) {
        setError('Could not connect to backend. Make sure the server is running.');
      }

      setPage(p);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Could not connect to backend. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/api/detections/${id}`, { method: 'DELETE' });
      fetchData(page);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const isFirstLoad = loading && stats.total_scans === 0 && !error;
  if (isFirstLoad) {
    return (
      <div className="page dashboard-page">
        <div className="loading-state">
          <Loader2 size={40} className="spin" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Mask', value: stats.total_mask },
    { name: 'No Mask', value: stats.total_no_mask },
    { name: 'Uncertain', value: stats.total_uncertain },
  ].filter(d => d.value > 0);

  return (
    <motion.div
      className="page dashboard-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Detection history and compliance analytics</p>
        </div>
        <button className="btn btn-outline" onClick={() => fetchData(page)} id="refresh-btn">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="dashboard-stats">
        <StatCard icon={BarChart3} label="Total Scans" value={stats.total_scans} color="#3b82f6" delay={0} />
        <StatCard icon={Users} label="Faces Detected" value={stats.total_faces} color="#8b5cf6" delay={0.1} />
        <StatCard icon={ShieldCheck} label="Compliance Rate" value={`${stats.compliance_rate}%`} color="#10b981" delay={0.2} />
        <StatCard icon={TrendingUp} label="With Mask" value={stats.total_mask} subtitle={`vs ${stats.total_no_mask} without`} color="#10b981" delay={0.3} />
      </div>

      {/* Charts */}
      <div className="charts-row">
        {/* Trend Chart */}
        <div className="glass-card chart-card">
          <h3 className="panel-title">Detection Trend (7 Days)</h3>
          {stats?.trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="gradMask" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradNoMask" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Area type="monotone" dataKey="mask" stroke="#10b981" fill="url(#gradMask)" name="Mask" />
                <Area type="monotone" dataKey="no_mask" stroke="#ef4444" fill="url(#gradNoMask)" name="No Mask" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">
              <p>No trend data yet. Start detecting to see analytics!</p>
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="glass-card chart-card chart-card-small">
          <h3 className="panel-title">Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  wrapperStyle={{ color: '#94a3b8', fontSize: '13px' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,23,42,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">
              <p>No detection data yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Detection History */}
      <div className="glass-card history-card">
        <h3 className="panel-title">
          Recent Detections
          <span className="badge">{detections.total} total</span>
        </h3>

        {detections.items.length > 0 ? (
          <>
            <div className="detection-list">
              {detections.items.map((det) => (
                <DetectionCard
                  key={det.id}
                  detection={det}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {detections.pages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page <= 1}
                  onClick={() => fetchData(page - 1)}
                >
                  ← Previous
                </button>
                <span className="page-info">
                  Page {detections.page} of {detections.pages}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page >= detections.pages}
                  onClick={() => fetchData(page + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <ShieldCheck size={40} />
            <p>No detections yet. Start scanning to build your history!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
