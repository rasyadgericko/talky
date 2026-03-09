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

// Smooth flowing wave layers
const WAVE_LAYERS = [
  { freq: 1.2, speed: 0.8, amplitude: 0.6, opacity: 0.5 },
  { freq: 2.0, speed: 1.2, amplitude: 0.35, opacity: 0.35 },
  { freq: 3.2, speed: 1.8, amplitude: 0.2, opacity: 0.25 },
];

export default function Waveform({
  audioLevel,
  isActive,
  compact = false,
  className = "",
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const isActiveRef = useRef(isActive);
  const audioLevelRef = useRef(audioLevel);
  const smoothLevelRef = useRef(0);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);

  // Keep refs in sync
  isActiveRef.current = isActive;
  audioLevelRef.current = audioLevel;

  useEffect(() => {
    let running = true;

    function draw(timestamp: number) {
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

      // Delta time
      const dt = lastFrameRef.current ? (timestamp - lastFrameRef.current) / 1000 : 0.016;
      lastFrameRef.current = timestamp;
      timeRef.current += dt;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const midY = height / 2;

      // Smooth the audio level (ease toward target)
      const target = isActiveRef.current ? Math.min(audioLevelRef.current * 12, 1) : 0;
      const easeSpeed = target > smoothLevelRef.current ? 12 : 4;
      smoothLevelRef.current += (target - smoothLevelRef.current) * Math.min(easeSpeed * dt, 1);

      const level = smoothLevelRef.current;
      const t = timeRef.current;

      ctx.clearRect(0, 0, width, height);

      // Draw each wave layer
      for (const layer of WAVE_LAYERS) {
        const amp = level * layer.amplitude * height * 0.8;
        const baseOpacity = isActiveRef.current
          ? layer.opacity + level * 0.4
          : layer.opacity * 0.3;

        ctx.beginPath();
        ctx.moveTo(0, midY);

        const steps = Math.ceil(width / 2);
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * width;
          const normalizedX = x / width;

          // Combine sine waves for organic motion
          const wave =
            Math.sin(normalizedX * Math.PI * 2 * layer.freq + t * layer.speed * Math.PI * 2) *
            0.6 +
            Math.sin(normalizedX * Math.PI * 2 * layer.freq * 1.5 + t * layer.speed * 1.3 * Math.PI * 2) *
            0.3 +
            Math.sin(normalizedX * Math.PI * 2 * 0.5 + t * 0.4 * Math.PI * 2) *
            0.1;

          // Taper at edges for smooth fade
          const edgeFade = Math.sin(normalizedX * Math.PI);
          const y = midY + wave * amp * edgeFade;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(baseOpacity, 1)})`;
        ctx.lineWidth = compact ? 1.5 : 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();

        // Fill a subtle gradient below the wave
        if (amp > 0.5) {
          ctx.lineTo(width, midY);
          ctx.lineTo(0, midY);
          ctx.closePath();
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(baseOpacity * 0.15, 0.1)})`;
          ctx.fill();
        }
      }

      // Subtle center line when idle
      if (level < 0.05) {
        const idleOpacity = 0.08 + Math.sin(t * 1.5) * 0.03;
        ctx.beginPath();
        ctx.moveTo(width * 0.1, midY);
        ctx.lineTo(width * 0.9, midY);
        ctx.strokeStyle = `rgba(255, 255, 255, ${idleOpacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [compact]);

  const h = compact ? 28 : 48;

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height: h }}
    />
  );
}
