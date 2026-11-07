"use client";

import { useEffect, useRef, useState } from "react";
import GameLogo from "./GameLogo";

export default function LoadingScreen({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const [progress, setProgress] = useState(0);
  const [started] = useState(() => Date.now());
  const readyRef = useRef(ready);
  const finishRef = useRef(onFinish);
  const finished = useRef(false);

  useEffect(() => { readyRef.current = ready; }, [ready]);
  useEffect(() => { finishRef.current = onFinish; });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const canFinish = readyRef.current && Date.now() - started > 1400;
        if (canFinish) return Math.min(100, current + 5);
        return Math.min(92, current + Math.max(0.35, (92 - current) * 0.05));
      });
    }, 60);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (progress >= 100 && !finished.current) {
      finished.current = true;
      window.setTimeout(() => finishRef.current(), 320);
    }
  }, [progress]);

  const value = Math.round(progress);
  return (
    <main className="loading-screen splash">
      <div className="loading-bg" />
      <div className="splash-logo"><GameLogo /></div>
      <div className="splash-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Загрузка игры">
        <div className="splash-fill" style={{ width: `${progress}%` }} />
        <span>{value}%</span>
      </div>
    </main>
  );
}
