"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBackgroundMusic } from "@/lib/audio";
import { transcodeWebMToMp4 } from "@/lib/ffmpeg";
import { YogaCanvas } from "@/components/YogaCanvas";
import type { YogaCanvasHandle } from "@/components/YogaCanvas";

const WIDTH = 1080; // vertical 9:16
const HEIGHT = 1920;
const DURATION_MS = 45_000;

const narrationScript = [
  {
    t: 0,
    title: "Cat-Cow Pose",
    text:
      "Welcome. Let's begin with Cat-Cow. Inhale to arch the back, lift the chest. Exhale to round and gently draw the belly in. Move slowly with your breath.",
  },
  {
    t: 15_000,
    title: "Child's Pose",
    text:
      "Shift back into Child's Pose. Hips to heels, arms relaxed. Breathe into your lower back. Soften your shoulders and jaw.",
  },
  {
    t: 30_000,
    title: "Seated Forward Bend",
    text:
      "Come to a comfortable seat, extend your legs, and fold forward gently. Keep the spine long and relax into the stretch.",
  },
];

export default function Page() {
  const canvasRef = useRef<YogaCanvasHandle | null>(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [webmUrl, setWebmUrl] = useState<string | null>(null);
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const startNarration = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const pick = voices.find(v => v.lang.startsWith("en-US") && v.name.toLowerCase().includes("female")) ||
      voices.find(v => v.lang.startsWith("en-US")) || voices[0];
    narrationScript.forEach(({ t, text }) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.pitch = 1.1;
      if (pick) u.voice = pick;
      setTimeout(() => window.speechSynthesis.speak(u), t + 300);
    });
  }, []);

  const handleRecord = useCallback(async () => {
    if (!canvasRef.current || recording) return;
    setStatus("Preparing...");
    setProgress(0);
    setWebmUrl(null);
    setMp4Url(null);

    const canvas = canvasRef.current;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // Capture canvas video
    const fps = 30;
    const videoStream = canvas.captureStream(fps);

    // Background music via Web Audio
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const music = createBackgroundMusic(audioCtx);
    const mix = audioCtx.createGain();
    mix.gain.value = 0.4;
    music.connect(mix);

    // Destination for MediaRecorder
    const dest = audioCtx.createMediaStreamDestination();
    mix.connect(dest);

    // Combine audio + video
    const combined = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const recorder = new MediaRecorder(combined, {
      mimeType: "video/webm;codecs=vp9,opus",
      videoBitsPerSecond: 6_000_000,
      audioBitsPerSecond: 128_000,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = ev => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    recorder.onstop = async () => {
      music.stop(0);
      audioCtx.close();
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setWebmUrl(url);
      setStatus("Transcoding to MP4 (this may take ~30-60s)...");
      try {
        const mp4Blob = await transcodeWebMToMp4(blob, (p) => setProgress(Math.round(p * 100)));
        const mp4ObjectUrl = URL.createObjectURL(mp4Blob);
        setMp4Url(mp4ObjectUrl);
        setStatus("Done");
      } catch (e) {
        console.error(e);
        setStatus("Transcoding failed. WebM available.");
      } finally {
        setRecording(false);
      }
    };

    // Start audio and narration
    const now = audioCtx.currentTime + 0.1;
    music.start(now);
    startNarration();

    // Start recording and animation
    setStatus("Recording 45s...");
    setRecording(true);
    recorder.start(100);

    // Drive animation for 45s, then stop
    const start = performance.now();
    const draw = (tNow: number) => {
      const elapsed = tNow - start;
      const c: any = canvasRef.current;
      if (c && typeof c.renderFrame === "function") {
        c.renderFrame(elapsed);
      }
      const pct = Math.min(1, elapsed / DURATION_MS);
      setProgress(Math.round(pct * 100));
      if (elapsed >= DURATION_MS) {
        recorder.stop();
        return;
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }, [recording, startNarration]);

  const download = (href: string | null, name: string) => {
    if (!href) return;
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="badge">Vertical 9:16 ? 1080?1920 ? 45s</div>
          <h1 className="brand">3 Fast Morning Stretches for Back Pain (Yoga)</h1>
          <div className="meta">Bright 2D animation ? Calm female narration ? Soft music</div>
        </div>
        <div className="controls">
          <button className="button" onClick={handleRecord} disabled={recording}>
            {recording ? "Recording..." : "Generate 45s Video"}
          </button>
          <button className="button secondary" onClick={() => download(mp4Url, "morning-stretches.mp4")} disabled={!mp4Url}>
            Download MP4
          </button>
          <button className="button secondary" onClick={() => download(webmUrl, "morning-stretches.webm")} disabled={!webmUrl}>
            Download WebM
          </button>
        </div>
      </div>

      <div className="card">
        <div className="status">{status} {progress ? `? ${progress}%` : null}</div>
        <div className="canvasWrap">
          <YogaCanvas ref={canvasRef} width={WIDTH} height={HEIGHT} durationMs={DURATION_MS} />
        </div>
        <div className="meta" style={{marginTop:12}}>Tip: Keep this tab focused during recording for best results.</div>
      </div>
    </div>
  );
}
