import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, ShieldCheck, ShieldX, ShieldQuestion, Users, Wifi, WifiOff } from 'lucide-react';
import { WS_URL } from '../config';
import StatCard from '../components/StatCard';

export default function LiveDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamIntervalRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [liveCounts, setLiveCounts] = useState({ mask: 0, noMask: 0, uncertain: 0, total: 0 });

  useEffect(() => {
    return () => {
      stopCamera();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    wsRef.current = new WebSocket(WS_URL);

    wsRef.current.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
    };

    wsRef.current.onmessage = (event) => {
      const detections = JSON.parse(event.data);
      drawDetections(detections);

      // Update live counts
      const mask = detections.filter(d => d.label === 'Mask').length;
      const noMask = detections.filter(d => d.label === 'No Mask').length;
      const uncertain = detections.filter(d => d.label === 'Uncertain').length;
      setLiveCounts({ mask, noMask, uncertain, total: detections.length });
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        connectWebSocket();

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          startSendingFrames();
        };
      }
    } catch (err) {
      console.error('Error accessing the camera', err);
      alert('Could not access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setLiveCounts({ mask: 0, noMask: 0, uncertain: 0, total: 0 });
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const startSendingFrames = () => {
    streamIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && videoRef.current) {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = videoRef.current.videoWidth;
        offscreenCanvas.height = videoRef.current.videoHeight;
        const ctx = offscreenCanvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        const base64Image = offscreenCanvas.toDataURL('image/jpeg', 0.6);
        wsRef.current.send(base64Image);
      }
    }, 100);
  };

  const drawDetections = (detections) => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    ctx.clearRect(0, 0, width, height);
    ctx.textBaseline = 'top';
    ctx.font = '600 16px "Inter", sans-serif';

    detections.forEach(det => {
      const { box, label, color, pred } = det;
      const [x, y, w, h] = box;

      const confText = label !== 'Uncertain' ? `${(pred < 0.5 ? (1 - pred) : pred * 100).toFixed(1)}%` : '';
      const text = `${label} ${confText}`;

      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);

      const mirroredX = width - (x + w);

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(mirroredX, y, w, h);

      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle = color;
      ctx.fillRect(mirroredX, y - 25, textWidth + 10, 25);

      ctx.restore();
      ctx.fillStyle = '#000000';
      const textStartX = x + w - textWidth - 10;
      ctx.fillText(text, textStartX + 5, y - 20);
    });
  };

  return (
    <motion.div
      className="page live-detection-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-header">
        <h1>Live Detection</h1>
        <p>Real-time face mask detection using your webcam</p>
      </div>

      <div className="live-layout">
        {/* Video Panel */}
        <div className="glass-card video-panel">
          <div className="status-badge">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            {isConnected ? (
              <><Wifi size={14} /> Connected to AI Engine</>
            ) : (
              <><WifiOff size={14} /> AI Engine Disconnected</>
            )}
          </div>

          <div className="video-container" id="video-container">
            <video
              ref={videoRef}
              className="video-feed"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="overlay-canvas"
            />
            {!isStreaming && (
              <div className="video-placeholder">
                <Video size={48} />
                <p>Click "Start Camera" to begin detection</p>
              </div>
            )}
          </div>

          <div className="controls">
            {!isStreaming ? (
              <button className="btn btn-primary" onClick={startCamera} id="start-camera-btn">
                <Video size={20} />
                Start Camera
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopCamera} id="stop-camera-btn">
                <VideoOff size={20} />
                Stop Camera
              </button>
            )}
          </div>
        </div>

        {/* Live Stats Panel */}
        <div className="stats-panel">
          <h3 className="panel-title">Live Stats</h3>
          <StatCard icon={Users} label="Faces Detected" value={liveCounts.total} color="#3b82f6" delay={0} />
          <StatCard icon={ShieldCheck} label="With Mask" value={liveCounts.mask} color="#10b981" delay={0.1} />
          <StatCard icon={ShieldX} label="No Mask" value={liveCounts.noMask} color="#ef4444" delay={0.2} />
          <StatCard icon={ShieldQuestion} label="Uncertain" value={liveCounts.uncertain} color="#eab308" delay={0.3} />
        </div>
      </div>
    </motion.div>
  );
}
