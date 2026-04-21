import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, ShieldCheck, ShieldX, ShieldQuestion, Loader2, X, Users } from 'lucide-react';
import { API_URL } from '../config';

export default function ImageUpload() {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const runDetection = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_URL}/api/detect-image`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Detection failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <motion.div
      className="page upload-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="page-header">
        <h1>Image Analysis</h1>
        <p>Upload an image to detect face masks</p>
      </div>

      <div className="upload-layout">
        {/* Upload Zone */}
        <div className="glass-card upload-panel">
          {!preview ? (
            <div
              className={`drop-zone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              id="drop-zone"
            >
              <Upload size={48} className="drop-icon" />
              <h3>Drop image here or click to browse</h3>
              <p>Supports JPG, PNG, WebP — Max 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="file-input-hidden"
                id="file-input"
              />
            </div>
          ) : (
            <div className="preview-area">
              <div className="preview-header">
                <span className="preview-name">
                  <Image size={16} />
                  {selectedFile?.name}
                </span>
                <button className="btn-icon" onClick={clearAll} title="Clear">
                  <X size={18} />
                </button>
              </div>
              <div className="preview-image-container">
                <img
                  src={result ? result.annotated_image : preview}
                  alt="Preview"
                  className="preview-image"
                />
              </div>
              <div className="preview-actions">
                {!result ? (
                  <button
                    className="btn btn-primary"
                    onClick={runDetection}
                    disabled={loading}
                    id="analyze-btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={20} />
                        Analyze Image
                      </>
                    )}
                  </button>
                ) : (
                  <button className="btn btn-outline" onClick={clearAll}>
                    <Upload size={20} />
                    Upload Another
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              <ShieldX size={16} />
              {error}
            </div>
          )}
        </div>

        {/* Results Panel */}
        <AnimatePresence>
          {result && (
            <motion.div
              className="glass-card results-panel"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="panel-title">Detection Results</h3>

              <div className="result-summary">
                <div className="result-stat">
                  <Users size={20} />
                  <div>
                    <strong>{result.summary.total_faces}</strong>
                    <span>Face{result.summary.total_faces !== 1 ? 's' : ''} Found</span>
                  </div>
                </div>
                <div className="result-stat mask">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>{result.summary.mask}</strong>
                    <span>With Mask</span>
                  </div>
                </div>
                <div className="result-stat no-mask">
                  <ShieldX size={20} />
                  <div>
                    <strong>{result.summary.no_mask}</strong>
                    <span>No Mask</span>
                  </div>
                </div>
                {result.summary.uncertain > 0 && (
                  <div className="result-stat uncertain">
                    <ShieldQuestion size={20} />
                    <div>
                      <strong>{result.summary.uncertain}</strong>
                      <span>Uncertain</span>
                    </div>
                  </div>
                )}
              </div>

              {result.detections.length > 0 && (
                <div className="result-details">
                  <h4>Detection Details</h4>
                  {result.detections.map((det, i) => (
                    <div key={i} className="detail-row" style={{ borderLeftColor: det.color }}>
                      <span className="detail-label" style={{ color: det.color }}>
                        {det.label}
                      </span>
                      <span className="detail-conf">
                        Confidence: {(det.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {result.summary.total_faces === 0 && (
                <div className="no-faces-msg">
                  <p>No faces were detected in this image. Try uploading a clearer photo with visible faces.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
