"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import type { TripReel as Reel } from "@/agent/lib/reel";
import { REEL_FPS, REEL_HEIGHT, REEL_WIDTH, reelDuration, TripReel } from "@/remotion/TripReel";

// The trip_reels tool's output as a vertical, snap-scrolling feed: one 9:16 video per trip.
// The reel that is mostly on screen plays; the rest pause, like a short-video feed.
export function TripReels({ reels }: { readonly reels: readonly Reel[] }) {
  if (reels.length === 0) return null;
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="h-[min(640px,75dvh)] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-2xl bg-black [scrollbar-width:none]">
        {reels.map((reel, index) => (
          <ReelItem index={index} key={reel.placeId} reel={reel} total={reels.length} />
        ))}
      </div>
      {reels.length > 1 ? (
        <p className="mt-2 text-center text-muted-foreground text-xs">Scroll for {reels.length - 1} more trip{reels.length > 2 ? "s" : ""}</p>
      ) : null}
    </div>
  );
}

function ReelItem({ reel, index, total }: { reel: Reel; index: number; total: number }) {
  const container = useRef<HTMLDivElement>(null);
  const player = useRef<PlayerRef>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio >= 0.6), {
      threshold: [0, 0.6, 1],
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible) player.current?.play();
    else player.current?.pause();
  }, [visible]);

  return (
    <div className="relative flex h-full snap-start snap-always items-center justify-center" ref={container}>
      <Player
        acknowledgeRemotionLicense
        autoPlay={false}
        clickToPlay
        component={TripReel}
        compositionHeight={REEL_HEIGHT}
        compositionWidth={REEL_WIDTH}
        controls
        durationInFrames={reelDuration(reel)}
        fps={REEL_FPS}
        inputProps={{ reel }}
        loop
        ref={player}
        style={{ height: "100%", aspectRatio: `${REEL_WIDTH} / ${REEL_HEIGHT}` }}
      />
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/50 px-2 py-0.5 text-white text-xs">
        {index + 1} / {total}
      </span>
    </div>
  );
}
