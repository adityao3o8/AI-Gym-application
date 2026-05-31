"use client";

import { useEffect, useRef, useState } from "react";

type BackgroundVideoProps = {
  /**
   * HLS (.m3u8) or progressive (.mp4) video URL. If omitted, the layered
   * CSS aurora background carries the visual on its own.
   *
   * Example HLS: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
   */
  src?: string;
  poster?: string;
};

export function BackgroundVideo({ src, poster }: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isHls = src.toLowerCase().includes(".m3u8");
    let hls: { destroy: () => void } | null = null;

    if (isHls) {
      // Safari / iOS: native HLS
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        // Everywhere else: hls.js
        (async () => {
          const Hls = (await import("hls.js")).default;
          if (Hls.isSupported()) {
            const instance = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
            });
            instance.loadSource(src);
            instance.attachMedia(video);
            hls = instance;
          }
        })();
      }
    } else {
      video.src = src;
    }

    const onReady = () => setReady(true);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);
    video.play().catch(() => {
      // autoplay can be blocked — CSS background still carries the look
    });

    return () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("playing", onReady);
      hls?.destroy();
    };
  }, [src]);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#060814]" />

      <div
        className="absolute inset-0 opacity-[0.9]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(123,57,252,0.45), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 110%, rgba(248,123,82,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 10% 100%, rgba(123,57,252,0.18), transparent 55%)",
        }}
      />

      <div
        className="absolute -inset-[20%] animate-aurora opacity-60 blur-3xl"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(123,57,252,0.45), rgba(248,123,82,0.18), rgba(123,57,252,0.0) 35%, rgba(151,89,255,0.4), rgba(248,123,82,0.12), rgba(123,57,252,0.45))",
        }}
      />

      {src && (
        <video
          ref={videoRef}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className={`absolute inset-0 size-full object-cover mix-blend-screen transition-opacity duration-1000 ${
            ready ? "opacity-35" : "opacity-0"
          }`}
        />
      )}

      <div className="absolute inset-0 grid-bg opacity-[0.3] mix-blend-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(6,8,20,0.85)_85%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#060814]" />
    </div>
  );
}
