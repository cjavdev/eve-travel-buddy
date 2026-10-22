import { Composition } from "remotion";
import type { TripReel as Reel } from "../agent/lib/reel";
import { REEL_FPS, REEL_HEIGHT, REEL_WIDTH, reelDuration, TripReel } from "./TripReel";

// For Remotion Studio and MP4 renders (`npm run reel:studio`, `npm run reel:render`).
// The chat plays the same composition live with <Player>, so this is only needed for files.
// Pass a real reel with --props='{"reel": ...}' (the trip_reels tool output has one per place).
const sample: Reel = {
  placeId: "tokyo",
  name: "Tokyo, Japan",
  lat: 35.6762,
  lng: 139.6503,
  home: { name: "San Francisco", code: "SFO", lat: 37.62, lng: -122.38 },
  headline: "F1: Japanese Grand Prix",
  when: "Apr 2–6, 2027",
  confirmedDate: false,
  travelers: 4,
  mockCost: 7420,
  gallery: [],
  beats: [
    { name: "Greyson", emoji: "🎭", color: "#8b5cf6", title: "Shiki Theatre musicals and Kabuki-za", reason: "April is a strong month for Shiki Theatre musicals and Kabuki-za", photos: [] },
    { name: "Logan", emoji: "🏎️", color: "#ef4444", title: "F1: Japanese Grand Prix at Suzuka", reason: "F1 race weekend at Suzuka", photos: [] },
    { name: "CJ & wife", emoji: "🚴", color: "#10b981", title: "Tamagawa cycling road along the Tama River", reason: "Highs around 19°C with few rainy days", photos: [] },
  ],
};

export const RemotionRoot = () => (
  <Composition
    calculateMetadata={({ props }) => ({ durationInFrames: reelDuration(props.reel) })}
    component={TripReel}
    defaultProps={{ reel: sample }}
    durationInFrames={reelDuration(sample)}
    fps={REEL_FPS}
    height={REEL_HEIGHT}
    id="TripReel"
    width={REEL_WIDTH}
  />
);
