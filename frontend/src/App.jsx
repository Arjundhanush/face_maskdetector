import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import LiveDetection from './pages/LiveDetection';
import ImageUpload from './pages/ImageUpload';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <div className="app-shell" id="app-shell">
      <Navbar />
      <main className="main-content" id="main-content">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/detect" element={<LiveDetection />} />
            <Route path="/upload" element={<ImageUpload />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}
