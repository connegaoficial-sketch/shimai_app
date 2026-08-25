"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ShimaiLogo } from "@/components/public/ShimaiLogo";
import { shimaiBrand } from "@/lib/brand/shimai";
import { cn } from "@/lib/utils";

/** Emil: rare/first-view intro can be longer; exit still ease-out + blur. */
const VIDEO_FADE_MS = 800;
const STATIC_FADE_MS = 1100;

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

  const cinemaActive = phase === "playing" || phase === "video-out";
  const isVideoFading = phase === "video-out";

  return (
    <div
      className={cn(
        "shimai-hero-stage relative w-full overflow-hidden shimai-hero-stage-resize",
        cinemaActive ? "shimai-hero-stage--cinema" : "shimai-hero-stage--logo",
        className,
      )}
    >
      {/* Atmospheric canvas — gold/sakura light so the stage never reads as a flat box */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,rgba(201,164,92,0.22),transparent_62%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_70%,rgba(232,165,181,0.08),transparent_65%)]"
      />

      {/* Static lockup — same cinema mask as video (edges dissolve into black) */}
      <div
        className={cn(
          "absolute inset-0 z-[2] flex items-center justify-center shimai-hero-static-in",
          staticVisible
            ? "pointer-events-auto opacity-100 scale-100"
            : "pointer-events-none opacity-0 scale-[0.98]",
        )}
        aria-hidden={!staticVisible}
      >
        <div className="relative h-full w-full">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[42%] h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,164,92,0.22),transparent_68%)] blur-3xl"
          />
          {/* Soft cinema mask; sized so the full lockup stays readable */}
          <div className="shimai-hero-cinema absolute inset-0 flex items-center justify-center">
            <ShimaiLogo
              variant="heroFull"
              priority
              className="relative h-auto w-auto max-h-[min(82%,30rem)] max-w-[min(92%,44rem)] object-contain sm:max-h-[min(84%,32rem)] sm:max-w-[min(94%,48rem)]"
            />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 shimai-hero-cinema-vignette"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_50%_45%,transparent_0%,transparent_35%,rgba(8,8,8,0.35)_70%,#080808_100%)]"
          />
        </div>
      </div>

      {/* Cinematic video banner — cover + overscale so hard edges never appear */}
      {videoMounted && !skipVideo ? (
        <div
          className={cn(
            "absolute inset-0 z-[1] shimai-hero-video-out",
            isVideoFading
              ? "pointer-events-none opacity-0 blur-[6px] scale-[1.03]"
              : "opacity-100 blur-0 scale-100",
          )}
          aria-hidden={isVideoFading}
        >
          <div className="shimai-hero-cinema absolute inset-0">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              controls={false}
              controlsList="nodownload nofullscreen noremoteplayback"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[118%] w-[118%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
              aria-label={`${shimaiBrand.name} ${shimaiBrand.tagline} — ${shimaiBrand.motto}`}
              onEnded={finishIntro}
              onError={finishIntro}
            >
              <source src={shimaiBrand.logos.heroAnimation} type="video/mp4" />
            </video>
          </div>

          {/* Edge dissolve into page black — cinematic letterbox feel without visible frame */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 shimai-hero-cinema-vignette"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_50%_45%,transparent_0%,transparent_35%,rgba(8,8,8,0.35)_70%,#080808_100%)]"
          />
        </div>
      ) : null}
    </div>
  );
}
