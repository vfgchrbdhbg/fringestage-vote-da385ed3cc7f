"use client";

import { useEffect, useRef } from "react";
import { designTokens } from "@/lib/design-tokens";

interface RadarChartProps {
  data: {
    plotTension: number;
    performance: number;
    stageDesign: number;
    pacing: number;
  };
  maxValue?: number;
}

export default function RadarChart({ data, maxValue = 100 }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const size = 300;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw background circles
    ctx.strokeStyle = designTokens.colors.gray[200];
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Labels and their positions
    const labels = [
      { name: "Plot Tension", value: data.plotTension, angle: -Math.PI / 2 },
      { name: "Performance", value: data.performance, angle: 0 },
      { name: "Stage Design", value: data.stageDesign, angle: Math.PI / 2 },
      { name: "Pacing", value: data.pacing, angle: Math.PI },
    ];

    // Draw axes
    ctx.strokeStyle = designTokens.colors.gray[200];
    ctx.lineWidth = 1;
    labels.forEach((label) => {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      const endX = centerX + Math.cos(label.angle) * radius;
      const endY = centerY + Math.sin(label.angle) * radius;
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });

    // Draw data polygon
    ctx.beginPath();
    labels.forEach((label, index) => {
      const normalizedValue = (label.value / maxValue) * radius;
      const x = centerX + Math.cos(label.angle) * normalizedValue;
      const y = centerY + Math.sin(label.angle) * normalizedValue;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = designTokens.colors.primary[600] + "40";
    ctx.fill();
    ctx.strokeStyle = designTokens.colors.primary[600];
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = designTokens.colors.primary[600];
    labels.forEach((label) => {
      const normalizedValue = (label.value / maxValue) * radius;
      const x = centerX + Math.cos(label.angle) * normalizedValue;
      const y = centerY + Math.sin(label.angle) * normalizedValue;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = designTokens.colors.gray[900];
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    labels.forEach((label) => {
      const labelDistance = radius + 30;
      const x = centerX + Math.cos(label.angle) * labelDistance;
      const y = centerY + Math.sin(label.angle) * labelDistance;
      
      // Draw label text
      ctx.fillText(label.name, x, y - 8);
      
      // Draw value
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(label.value.toString(), x, y + 8);
      ctx.font = "12px sans-serif";
    });
  }, [data, maxValue]);

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
}

