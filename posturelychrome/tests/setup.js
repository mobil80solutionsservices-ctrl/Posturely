// Test setup for Chrome extension environment
import { vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
    onInstalled: {
      addListener: vi.fn()
    }
  },
  action: {
    onClicked: {
      addListener: vi.fn()
    }
  },
  sidePanel: {
    open: vi.fn()
  }
};

// Mock MediaDevices API
global.navigator.mediaDevices = {
  getUserMedia: vi.fn()
};

// Mock AudioContext
global.AudioContext = vi.fn(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
    type: 'sine',
    start: vi.fn(),
    stop: vi.fn()
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { 
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    }
  })),
  destination: {},
  currentTime: 0
}));

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now())
};

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));