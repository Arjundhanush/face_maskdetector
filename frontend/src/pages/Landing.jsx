import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Upload, BarChart3, Shield, Zap, Eye, Database } from 'lucide-react';

const features = [
  {
    icon: Video,
    title: 'Live Detection',
    desc: 'Real-time webcam face mask detection powered by deep learning with instant visual feedback.',
    link: '/detect',
    color: '#3b82f6',
  },
  {
    icon: Upload,
    title: 'Image Analysis',
    desc: 'Upload any image for instant mask compliance analysis with annotated results.',
    link: '/upload',
    color: '#10b981',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    desc: 'Track detection history, compliance trends, and view detailed statistics over time.',
    link: '/dashboard',
    color: '#8b5cf6',
  },
];

const techStack = [
  { icon: Zap, label: 'MobileNetV2', desc: 'Transfer Learning' },
  { icon: Eye, label: 'SSD Face Detector', desc: 'OpenCV DNN' },
  { icon: Database, label: 'MongoDB', desc: 'Persistent Storage' },
  { icon: Shield, label: 'FastAPI', desc: 'WebSocket + REST' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Hero */}
      <motion.section
        className="hero"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="hero-glow" />
        <div className="hero-icon">
          <Shield size={64} />
        </div>
        <h1 className="hero-title">
          Face Shield <span className="gradient-text">AI</span>
        </h1>
        <p className="hero-subtitle">
          Real-time face mask detection powered by deep learning.
          <br />
          Protect your community with intelligent compliance monitoring.
        </p>
        <div className="hero-actions">
          <Link to="/detect" className="btn btn-primary btn-lg">
            <Video size={20} />
            Start Live Detection
          </Link>
          <Link to="/upload" className="btn btn-outline btn-lg">
            <Upload size={20} />
            Upload Image
          </Link>
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        className="features-section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h2 className="section-title">Powerful Features</h2>
        <div className="features-grid">
          {features.map((f) => (
            <motion.div key={f.title} className="feature-card glass-card" variants={itemVariants}>
              <div className="feature-icon" style={{ background: `${f.color}22`, color: f.color }}>
                <f.icon size={28} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <Link to={f.link} className="feature-link" style={{ color: f.color }}>
                Try it →
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Tech Stack */}
      <motion.section
        className="tech-section"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <h2 className="section-title">Built With</h2>
        <div className="tech-grid">
          {techStack.map((t) => (
            <motion.div key={t.label} className="tech-item" variants={itemVariants}>
              <t.icon size={20} />
              <div>
                <strong>{t.label}</strong>
                <span>{t.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
