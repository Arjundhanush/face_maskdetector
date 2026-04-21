import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, subtitle, color = 'var(--primary-color)', delay = 0 }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="stat-icon" style={{ background: `${color}22`, color }}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <span className="stat-value" style={{ color }}>{value}</span>
        <span className="stat-label">{label}</span>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>
    </motion.div>
  );
}
