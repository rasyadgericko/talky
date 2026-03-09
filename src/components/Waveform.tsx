"use client";

import { useRef, useEffect } from "react";

interface WaveformProps {
  /** Current RMS audio level (0 to ~0.5, usually 0 to 0.1) */
  audioLevel: number;
  /** Whether the waveform is actively receiving audio */
  isActive: boolean;
  /** Compact mode for Island UI */
  compact?: boolean;
  /** Optional className override */
  className?: string;
}

const BAR_COUNT_FULL = 40;
const BAR_COUNT_COMPACT = 24;
const BUFFER_SIZE = 60;

export default function Waveform({
  audioLevel,
  isActive,
  compact = false,
  className = "",
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<number[]>(new Array(BUFFER_SIZE).fill(0));
  const animFrameRef = useRef<number>(0);
  const isActiveRef = useRef(isActive);
  const audioLevelRef = useRef(audioLevel);

  // Keep refs in sync with props
  isActiveRef.current = isActive;
  audioLevelRef.current = audioLevel;

  // Push new audio level into rolling buffer on every change
  useEffect(() => {
    if (isActive) {
      const buf = bufferRef.current;
      buf.push(audioLevel);
      if (buf.length > BUFFER_SIZE) buf.shift();
    }
  }, [audioLevel, isActive]);

  // Single animation loop that runs while mounted
  useEffect(() => {
    let running = true;

    function draw() {
      if (!running) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const barCount = compact ? BAR_COUNT_COMPACT : BAR_COUNT_FULL;
      const gap = compact ? 2 : 3;
      const barWidth = (width - gap * (barCount - 1)) / barCount;
      const buf = bufferRef.current;
      const active = isActiveRef.current;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < barCount; i++) {
        const bufIdx = Math.floor((i / barCount) * buf.length);
        const level = buf[bufIdx] || 0;

        // Normalize: RMS usually 0-0.1 for speech, scale to 0-1
        const normalized = Math.min(level * 10, 1);

        const minHeight = compact ? 2 : 3;
        const maxHeight = height * 0.9;
        const barHeight = minHeight + normalized * (maxHeight - minHeight);

        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        const opacity = active ? 0.3 + normalized * 0.7 : 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();

        // roundRect fallback for older Electron versions
        const radius = barWidth / 2;
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, radius);
        } else {
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + barWidth - radius, y);
          ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius);
          ctx.lineTo(x + barWidth, y + barHeight - radius);
          ctx.arcTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight, radius);
          ctx.lineTo(x + radius, y + barHeight);
          ctx.arcTo(x, y + barHeight, x, y + barHeight - radius, radius);
          ctx.lineTo(x, y + radius);
          ctx.arcTo(x, y, x + radius, y, radius);
        }
        ctx.fill();
      }

      // Fade out buffer when not active
      if (!active) {
        for (let i = 0; i < buf.length; i++) {
          buf[i] *= 0.9;
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [compact]); // Only re-create loop if compact changes

  const height = compact ? 24 : 48;

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height }}
    />
  );
}
