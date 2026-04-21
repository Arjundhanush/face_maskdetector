import React from 'react';
import { ShieldCheck, ShieldX, ShieldQuestion, Clock } from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSourceBadge(source) {
  return source === 'webcam' ? '🎥 Webcam' : '📁 Upload';
}

export default function DetectionCard({ detection, onDelete }) {
  const { id, timestamp, num_faces, mask_count, no_mask_count, uncertain_count, source, thumbnail } = detection;

  return (
    <div className="detection-card" id={`detection-${id}`}>
      <div className="detection-thumb">
        {thumbnail ? (
          <img src={`data:image/jpeg;base64,${thumbnail}`} alt="Detection thumbnail" />
        ) : (
          <div className="thumb-placeholder">
            <ShieldCheck size={24} />
          </div>
        )}
      </div>

      <div className="detection-info">
        <div className="detection-header">
          <span className="detection-time">
            <Clock size={14} />
            {formatDate(timestamp)}
          </span>
          <span className="detection-source">{getSourceBadge(source)}</span>
        </div>

        <div className="detection-stats">
          <span className="det-stat mask">
            <ShieldCheck size={14} />
            {mask_count}
          </span>
          <span className="det-stat no-mask">
            <ShieldX size={14} />
            {no_mask_count}
          </span>
          {uncertain_count > 0 && (
            <span className="det-stat uncertain">
              <ShieldQuestion size={14} />
              {uncertain_count}
            </span>
          )}
          <span className="det-stat faces">{num_faces} face{num_faces !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {onDelete && (
        <button className="detection-delete" onClick={() => onDelete(id)} title="Delete">
          ×
        </button>
      )}
    </div>
  );
}
