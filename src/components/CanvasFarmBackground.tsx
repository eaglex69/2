"use client";

import { useEffect, useRef } from "react";
import { useDesign } from "./DesignProvider";

// Canvas-режим используется PHP-версией. Карта рисуется на canvas с мягким
// параллаксом и частицами, а интерактивные HUD и кнопки остаются прежними.
export default function CanvasFarmBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const design = useDesign();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let width = 0;
    let height = 0;
    let loaded = false;
    const image = new Image();
    image.onload = () => { loaded = true; };
    const media = window.matchMedia("(max-width: 700px)");
    const chooseSource = () => design.slots.map || (media.matches ? "/images/farm-3d.jpg" : "/images/farm-valley-wide.jpg");
    const syncSource = () => { loaded = false; image.src = chooseSource(); };
    syncSource();
    media.addEventListener("change", syncSource);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const leaves = Array.from({ length: 12 }, (_, index) => ({
      x: (index * 83 % 100) / 100,
      y: (index * 47 % 100) / 100,
      speed: 0.00003 + (index % 4) * 0.000008,
      size: 1.5 + (index % 3),
    }));

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      if (loaded && width && height) {
        const zoom = 1.025 + Math.sin(time / 12000) * 0.012;
        const scale = Math.max(width / image.width, height / image.height) * zoom;
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        context.drawImage(image, (width - drawWidth) / 2 + Math.sin(time / 15000) * 4, (height - drawHeight) / 2, drawWidth, drawHeight);
      }
      context.fillStyle = "rgba(255,255,210,.32)";
      for (const leaf of leaves) {
        const x = ((leaf.x + time * leaf.speed) % 1.1) * width - width * 0.05;
        const y = (leaf.y + Math.sin(time / 1700 + leaf.x * 8) * 0.025) * height;
        context.beginPath();
        context.arc(x, y, leaf.size, 0, Math.PI * 2);
        context.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); media.removeEventListener("change", syncSource); };
  }, [design.slots.map]);

  return <canvas ref={ref} className="farm-canvas" aria-label="Интерактивная карта фермы" />;
}
