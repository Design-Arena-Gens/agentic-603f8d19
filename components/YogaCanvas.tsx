"use client";
import React, { forwardRef, useImperativeHandle, useRef } from "react";

type Props = {
  width: number;
  height: number;
  durationMs: number;
};

export type YogaCanvasHandle = HTMLCanvasElement & {
  renderFrame: (timeMs: number) => void;
};

function drawStickFigure(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  posture: "cat" | "cow" | "child" | "seated",
  t: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#4a4a4a";
  ctx.fillStyle = "#7cc79f";

  // Head
  ctx.beginPath();
  ctx.arc(0, -60, 18, 0, Math.PI * 2);
  ctx.fill();

  // Spine curve amount for cat/cow
  const spineBend = posture === "cat" ? -0.35 : posture === "cow" ? 0.35 : 0.0;

  // Body (curved spine)
  ctx.beginPath();
  ctx.moveTo(0, -40);
  const spineLen = 120;
  for (let i = 1; i <= 4; i++) {
    const p = i / 4;
    const bend = Math.sin(p * Math.PI) * spineBend * 30;
    ctx.lineTo(bend, -40 + p * spineLen);
  }
  ctx.stroke();

  // Limbs per posture
  ctx.beginPath();
  if (posture === "cat" || posture === "cow") {
    // On all fours
    // shoulders/hips anchors
    const shoulder = { x: 0, y: 10 };
    const hip = { x: 0, y: 80 };

    // Arms
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(shoulder.x - 50, shoulder.y + 50);
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(shoulder.x + 50, shoulder.y + 50);

    // Legs
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(hip.x - 45, hip.y + 55);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(hip.x + 45, hip.y + 55);
    ctx.stroke();
  } else if (posture === "child") {
    // Kneeling folded forward
    ctx.moveTo(0, 20);
    ctx.lineTo(-40, 80);
    ctx.moveTo(0, 20);
    ctx.lineTo(40, 80);
    ctx.moveTo(-20, 90);
    ctx.lineTo(-55, 120);
    ctx.moveTo(20, 90);
    ctx.lineTo(55, 120);
    ctx.stroke();
  } else if (posture === "seated") {
    // Seated forward bend
    ctx.moveTo(0, 20);
    ctx.lineTo(-55, 90);
    ctx.moveTo(0, 20);
    ctx.lineTo(55, 90);
    // Arms towards feet
    ctx.moveTo(-15, 60);
    ctx.lineTo(-55, 115);
    ctx.moveTo(15, 60);
    ctx.lineTo(55, 115);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  durationMs: number
) {
  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#eef8f1");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Stage floor
  ctx.fillStyle = "#dff2e7";
  ctx.fillRect(0, height - 240, width, 240);

  // Animated accent circles
  const t = (timeMs % 6000) / 6000;
  const circleY = 220 + Math.sin(t * Math.PI * 2) * 12;
  ctx.fillStyle = "rgba(124,199,159,0.15)";
  for (let i = 0; i < 6; i++) {
    const cx = 120 + i * 180;
    ctx.beginPath();
    ctx.arc(cx, circleY, 40 + (i % 2) * 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Title text overlay and pose name
  ctx.textAlign = "center";
  ctx.fillStyle = "#215a3f";
  ctx.font = "bold 48px Inter, Arial";
  ctx.fillText("3 Fast Morning Stretches", width / 2, 90);
  ctx.font = "600 36px Inter, Arial";
  ctx.fillStyle = "#2f7453";
  ctx.fillText("for Back Pain (Yoga)", width / 2, 140);

  // Pose switching timeline
  const poseIdx = Math.min(2, Math.floor(timeMs / (durationMs / 3)));
  const pose: ("cat" | "cow" | "child" | "seated")[] = ["cow", "child", "seated"]; // Start with cow visually appealing
  const names = ["Cat-Cow Pose", "Child's Pose", "Seated Forward Bend"];
  const current = pose[poseIdx];
  const name = names[poseIdx];

  // Subtitle plate
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const plateW = 720;
  const plateH = 80;
  const plateX = (width - plateW) / 2;
  const plateY = 1600;
  // Rounded rectangle path
  const r = 16;
  ctx.beginPath();
  ctx.moveTo(plateX + r, plateY);
  ctx.lineTo(plateX + plateW - r, plateY);
  ctx.quadraticCurveTo(plateX + plateW, plateY, plateX + plateW, plateY + r);
  ctx.lineTo(plateX + plateW, plateY + plateH - r);
  ctx.quadraticCurveTo(plateX + plateW, plateY + plateH, plateX + plateW - r, plateY + plateH);
  ctx.lineTo(plateX + r, plateY + plateH);
  ctx.quadraticCurveTo(plateX, plateY + plateH, plateX, plateY + plateH - r);
  ctx.lineTo(plateX, plateY + r);
  ctx.quadraticCurveTo(plateX, plateY, plateX + r, plateY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#215a3f";
  ctx.font = "700 40px Inter, Arial";
  ctx.fillText(name, width / 2, plateY + 52);

  // Person figure in the center
  const midX = width / 2;
  const baseY = height / 2 + 120;

  // For Cat-Cow we alternate between cat and cow every 2 seconds within the first 15s
  let actualPosture: "cat" | "cow" | "child" | "seated" = current;
  if (poseIdx === 0) {
    const segmentT = (timeMs % 2000) / 2000;
    actualPosture = segmentT < 0.5 ? "cow" : "cat";
  }

  drawStickFigure(ctx, midX, baseY, 2.2, actualPosture, timeMs);

  // Footer note
  ctx.fillStyle = "#4a4a4a";
  ctx.font = "500 26px Inter, Arial";
  ctx.fillText("Breathe slowly. Move with comfort, never pain.", width / 2, height - 60);
}

export const YogaCanvas = forwardRef<YogaCanvasHandle, Props>(function YogaCanvas(
  { width, height, durationMs }: Props,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useImperativeHandle(
    ref,
    () => {
      const el = canvasRef.current as YogaCanvasHandle;
      (el as any).renderFrame = (timeMs: number) => {
        const ctx = el.getContext("2d");
        if (!ctx) return;
        drawFrame(ctx, width, height, timeMs, durationMs);
      };
      return el;
    },
    [width, height, durationMs]
  );

  return <canvas ref={canvasRef as any} width={width} height={height} />;
});
