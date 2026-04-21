/**
 * API configuration for Face Shield AI.
 * Uses VITE_API_URL environment variable in production,
 * falls back to localhost for development.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Derive WebSocket URL from the HTTP URL
const wsProtocol = API_BASE.startsWith('https') ? 'wss' : 'ws';
const wsBase = API_BASE.replace(/^https?/, wsProtocol);

export const API_URL = API_BASE;
export const WS_URL = `${wsBase}/ws/detect`;
