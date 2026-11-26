"use client";

import { useEffect, useRef, useState } from "react";

const DESKTOP_VIDEO = "/videos/arraial-desktop.mp4";
const MOBILE_VIDEO = "/videos/arraial-mobile.mp4";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [poster, setPoster] = useState("/videos/arraial-desktop.webp");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const mobileQuery = window.matchMedia("(max-width: 767px), (orientation: portrait) and (max-width: 1024px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

    if (reducedMotionQuery.matches || connection?.saveData) return;

    const loadVideo = () => {
      const isMobile = mobileQuery.matches;
      setPoster(isMobile ? "/videos/arraial-mobile.webp" : "/videos/arraial-desktop.webp");
      setSrc(isMobile ? MOBILE_VIDEO : DESKTOP_VIDEO);
    };
    loadVideo();
    mobileQuery.addEventListener("change", loadVideo);

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }, { threshold: 0.1 });
    observer.observe(video);

    const handleVisibility = () => {
      if (document.hidden) video.pause();
      else if (video.src) void video.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mobileQuery.removeEventListener("change", loadVideo);
      document.removeEventListener("visibilitychange", handleVisibility);
      observer.disconnect();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full object-cover"
      src={src ?? undefined}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden="true"
    />
  );
}
