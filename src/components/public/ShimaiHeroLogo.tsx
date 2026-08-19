"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ShimaiLogo } from "@/components/public/ShimaiLogo";
import { shimaiBrand } from "@/lib/brand/shimai";
import { cn } from "@/lib/utils";

const VIDEO_FADE_MS = 950;
const STATIC_FADE_MS = 1400;

type IntroPhase = "playing" | "video-out" | "static-in" | "done";

export function ShimaiHeroLogo({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const [skipVideo, setSkipVideo] = useState(false);
  const [phase, setPhase] = useState<IntroPhase>("playing");
  const [videoMounted, setVideoMounted] = useState(true);
  const [staticVisible, setStaticVisible] = useState(false);

  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const beginStaticReveal = useCallback(() => {
    setVideoMounted(false);
    setPhase("static-in");
    setStaticVisible(true);
    fadeTimerRef.current = window.setTimeout(() => {
      setPhase("done");
      fadeTimerRef.current = null;
    }, STATIC_FADE_MS);
  }, []);

  const finishIntro = useCallback(() => {
    clearFadeTimer();
    setPhase("video-out");
    fadeTimerRef.current = window.setTimeout(() => {
      beginStaticReveal();
    }, VIDEO_FADE_MS);
  }, [beginStaticReveal, clearFadeTimer]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (mq.matches) {
        clearFadeTimer();
        setSkipVideo(true);
        setVideoMounted(false);
        setStaticVisible(true);
        setPhase("done");
      }
    };

    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      clearFadeTimer();
    };
  }, [clearFadeTimer]);

  useEffect(() => {
    if (skipVideo || !videoMounted) return;

    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => finishIntro());
  }, [skipVideo, videoMounted, finishIntro]);

  const isVideoLarge = phase === "playing" || phase === "video-out";
  const isVideoFading = phase === "video-out";

  return (
    <div
      className={cn(
        "relative mx-auto grid w-full place-items-center shimai-hero-stage-resize",
        isVideoLarge ? "max-w-[min(calc(100vw-2rem),42rem)]" : "max-w-[min(100%,28rem)]",
        className,
      )}
      style={{
        minHeight: isVideoLarge
          ? "clamp(14rem, min(88vw, 72vh), 40rem)"
          : "clamp(12rem, min(62vw, 50vh), 28rem)",
      }}
    >
      <div
        className={cn(
          "col-start-1 row-start-1 flex w-full items-center justify-center shimai-hero-static-in",
          staticVisible
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        aria-hidden={!staticVisible}
      >
        <ShimaiLogo
          variant="full"
          priority
          className="h-auto w-auto max-h-[min(72vw,28rem)] max-w-[min(100%,28rem)] object-contain"
        />
      </div>

      {videoMounted && !skipVideo ? (
        <div
          className={cn(
            "col-start-1 row-start-1 flex w-full items-center justify-center shimai-hero-video-out",
            isVideoFading
              ? "pointer-events-none opacity-0 blur-xl scale-[1.04]"
              : "opacity-100 blur-0 scale-100",
          )}
          aria-hidden={isVideoFading}
        >
          <div className="relative flex scale-100 items-center justify-center sm:scale-[1.08] md:scale-[1.15]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              controls={false}
              controlsList="nodownload nofullscreen noremoteplayback"
              className={cn(
                "pointer-events-none h-auto w-auto max-h-[min(88vw,72vh,40rem)] max-w-[min(calc(100vw-2rem),42rem)] object-contain",
                "shimai-hero-video-feather",
                "[filter:drop-shadow(0_0_64px_rgba(201,164,92,0.16))]",
              )}
              aria-label={`${shimaiBrand.name} ${shimaiBrand.tagline} — ${shimaiBrand.motto}`}
              onEnded={finishIntro}
              onError={finishIntro}
            >
              <source src={shimaiBrand.logos.heroAnimation} type="video/mp4" />
            </video>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[-10%] bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(8,8,8,0.38)_56%,#080808_90%)]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
