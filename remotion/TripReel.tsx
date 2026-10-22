import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { evolvePath, getLength, getPointAtLength, getTangentAtLength } from "@remotion/paths";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { TripReel as Reel } from "../agent/lib/reel";
import type { Photo } from "../agent/lib/sources/photos";
import { MAP_ATTRIBUTION, MapTiles, toScreen, unwrap } from "./map";

// A vertical (9:16) trip reel in a black-and-white, Geist-set look: cover photo, flight
// from home, zoom into the place, a photo gallery, one beat per person, then the plan.
// A pure function of the reel JSON, so the chat's <Player> and an MP4 render match.
export const REEL_FPS = 30;
export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;

const INTRO = 90;
const ROUTE = 105;
const ZOOM = 90;
const GALLERY_SHOT = 24;
const BEAT = 105;
const OUTRO = 120;
const TRANSITION = 12;

const { fontFamily: SANS } = loadGeist("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
const { fontFamily: MONO } = loadGeistMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

const WHITE = "#ededed";
const GREY = "#a1a1a1";
const BORDER = "rgba(255,255,255,0.14)";

const galleryShots = (reel: Reel) => reel.gallery.slice(1);

export function reelDuration(reel: Reel) {
  const gallery = galleryShots(reel).length * GALLERY_SHOT;
  const scenes = [INTRO, ROUTE, ZOOM, ...(gallery ? [gallery] : []), ...reel.beats.map(() => BEAT), OUTRO];
  return scenes.reduce((a, b) => a + b, 0) - TRANSITION * (scenes.length - 1);
}

const shortName = (reel: Reel) => reel.name.split(",")[0];

export function TripReel({ reel }: { reel: Reel }) {
  const timing = linearTiming({ durationInFrames: TRANSITION });
  const shots = galleryShots(reel);
  const scenes: { key: string; frames: number; node: ReactNode }[] = [
    { key: "intro", frames: INTRO, node: <Intro reel={reel} /> },
    { key: "route", frames: ROUTE, node: <Route reel={reel} /> },
    { key: "zoom", frames: ZOOM, node: <ZoomIn reel={reel} /> },
    ...(shots.length ? [{ key: "gallery", frames: shots.length * GALLERY_SHOT, node: <Gallery photos={shots} reel={reel} /> }] : []),
    ...reel.beats.map((beat) => ({ key: `beat-${beat.name}`, frames: BEAT, node: <Beat beat={beat} /> })),
    { key: "outro", frames: OUTRO, node: <Outro reel={reel} /> },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", fontFamily: SANS, color: WHITE }}>
      <TransitionSeries>
        {scenes.flatMap((scene, i) => [
          ...(i > 0 ? [<TransitionSeries.Transition key={`${scene.key}-t`} presentation={fade()} timing={timing} />] : []),
          <TransitionSeries.Sequence durationInFrames={scene.frames} key={scene.key}>
            {scene.node}
          </TransitionSeries.Sequence>,
        ])}
      </TransitionSeries>
    </AbsoluteFill>
  );
}

function Rise({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 40}px)`, ...style }}>{children}</div>;
}

/** The small uppercase mono label used above every heading. */
function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 30, letterSpacing: 2, textTransform: "uppercase", color: GREY, ...style }}>
      {children}
    </div>
  );
}

function Triangle({ size, color = "#fff", style }: { size: number; color?: string; style?: CSSProperties }) {
  return (
    <svg height={size * 0.866} style={style} viewBox="0 0 100 86.6" width={size}>
      <polygon fill={color} points="50,0 100,86.6 0,86.6" />
    </svg>
  );
}

/** Faint square grid, the backdrop of every non-photo scene. */
function Grid({ opacity = 1 }: { opacity?: number }) {
  const line = "rgba(255,255,255,0.07)";
  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
        backgroundSize: "135px 135px",
        backgroundPosition: "-1px -1px",
      }}
    />
  );
}

/** Full-bleed photo with a slow push-in and a fade to black at the bottom for the text. */
function PhotoFill({ photo, from = 1.04, to = 1.14 }: { photo: Photo | undefined; from?: number; to?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [failed, setFailed] = useState(false);
  const scale = interpolate(frame, [0, durationInFrames], [from, to]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {photo && !failed ? (
        <Img
          onError={() => setFailed(true)}
          src={photo.url}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }}
        />
      ) : (
        <Grid />
      )}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.92) 82%, #000 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

function Credit({ photo }: { photo: Photo | undefined }) {
  return photo ? <Label style={{ fontSize: 20, marginTop: 36, opacity: 0.7 }}>Photo · {photo.credit}</Label> : null;
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <Triangle size={34} />
      <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: -0.5 }}>Travel Buddy</span>
      <span style={{ color: GREY, fontSize: 32 }}>/</span>
      <span style={{ color: GREY, fontSize: 32 }}>Trip idea</span>
    </div>
  );
}

function Intro({ reel }: { reel: Reel }) {
  const cover = reel.gallery[0];
  return (
    <AbsoluteFill>
      <PhotoFill photo={cover} />
      <AbsoluteFill style={{ padding: "130px 80px", justifyContent: "space-between" }}>
        <Rise>
          <Brand />
        </Rise>
        <div>
          <Rise delay={6}>
            <div style={{ fontSize: 150, fontWeight: 700, lineHeight: 0.95, letterSpacing: -7 }}>{shortName(reel)}.</div>
          </Rise>
          <Rise delay={14}>
            <div style={{ fontSize: 52, fontWeight: 500, marginTop: 32, letterSpacing: -1 }}>{reel.headline}</div>
          </Rise>
          <Rise delay={22}>
            <Label style={{ marginTop: 20, fontSize: 34 }}>
              {reel.when}
              {reel.confirmedDate ? "" : " · usual month"}
            </Label>
          </Rise>
          <Credit photo={cover} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function MapFrame({ children, title, label }: { children: ReactNode; title: string; label: string }) {
  return (
    <AbsoluteFill>
      {children}
      <Grid opacity={0.6} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 100%)" }} />
      <AbsoluteFill style={{ padding: "130px 80px" }}>
        <Rise>
          <Label>{label}</Label>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, marginTop: 12 }}>{title}</div>
        </Rise>
      </AbsoluteFill>
      <Label style={{ position: "absolute", left: 80, bottom: 70, fontSize: 20, opacity: 0.7 }}>{MAP_ATTRIBUTION}</Label>
    </AbsoluteFill>
  );
}

/** A white triangle standing on the point, with a black, hairline-bordered label above it. */
function Pin({ x, y, label, progress, muted = false }: { x: number; y: number; label: string; progress: number; muted?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -100%) scale(${progress})`,
        transformOrigin: "50% 100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 32,
          color: muted ? GREY : WHITE,
          background: "#000",
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: "10px 20px",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
      <Triangle
        color={muted ? GREY : "#fff"}
        size={muted ? 36 : 56}
        style={{ filter: muted ? undefined : "drop-shadow(0 0 24px rgba(255,255,255,0.65))" }}
      />
    </div>
  );
}

function Route({ reel }: { reel: Reel }) {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();
  const from = { lng: reel.home.lng, lat: reel.home.lat };
  const to = unwrap(from, { lng: reel.lng, lat: reel.lat });
  // Fit both ends at zoom 0, then zoom in until they span ~65% of the width or ~30% of the height.
  const a0 = toScreen(from, from, 0, 0, 0);
  const b0 = toScreen(to, from, 0, 0, 0);
  const fit = Math.min(
    Math.log2((width * 0.65) / Math.max(1, Math.abs(b0.x - a0.x))),
    Math.log2((height * 0.3) / Math.max(1, Math.abs(b0.y - a0.y))),
  );
  const fitZoom = Math.max(1, Math.min(7, fit));
  const zoom = interpolate(frame, [0, durationInFrames], [fitZoom - 0.4, fitZoom], { easing: Easing.out(Easing.quad) });
  const center = { lng: (from.lng + to.lng) / 2, lat: (from.lat + to.lat) / 2 };
  const a = toScreen(from, center, zoom, width, height);
  const b = toScreen(to, center, zoom, width, height);
  // A bowed line reads as a flight; bow it upward (north on the map) by a quarter of its length.
  const lift = Math.hypot(b.x - a.x, b.y - a.y) * 0.25;
  const path = `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - lift} ${b.x} ${b.y}`;
  const progress = interpolate(frame, [15, durationInFrames - 20], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const { strokeDasharray, strokeDashoffset } = evolvePath(progress, path);
  const length = getLength(path);
  const head = getPointAtLength(path, length * progress) ?? b;
  const tangent = getTangentAtLength(path, length * progress) ?? { x: 1, y: 0 };
  // The triangle points up at 0°, so add 90° to line it up with the direction of travel.
  const angle = (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI + 90;
  const arrive = spring({ frame: frame - (durationInFrames - 25), fps, config: { damping: 14 } });
  return (
    <MapFrame label="The flight" title={`${reel.home.code} → ${shortName(reel)}`}>
      <MapTiles center={center} height={height} width={width} zoom={zoom} />
      <svg height={height} style={{ position: "absolute", inset: 0 }} width={width}>
        <path d={path} fill="none" stroke="rgba(255,255,255,0.25)" strokeDasharray="2 16" strokeLinecap="round" strokeWidth={5} />
        <path
          d={path}
          fill="none"
          stroke="#fff"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={6}
          style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.8))" }}
        />
      </svg>
      <Pin label={reel.home.code} muted progress={1} x={a.x} y={a.y} />
      <Pin label={shortName(reel)} progress={arrive} x={b.x} y={b.y} />
      {progress > 0 && progress < 1 ? (
        <Triangle
          size={44}
          style={{ position: "absolute", left: head.x - 22, top: head.y - 19, transform: `rotate(${angle}deg)` }}
        />
      ) : null}
    </MapFrame>
  );
}

function ZoomIn({ reel }: { reel: Reel }) {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames, fps } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames - 15], [4, 12], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateRight: "clamp",
  });
  const pin = spring({ frame: frame - (durationInFrames - 30), fps, config: { damping: 14 } });
  return (
    <MapFrame label={`${reel.lat.toFixed(2)}° N, ${Math.abs(reel.lng).toFixed(2)}° ${reel.lng < 0 ? "W" : "E"}`} title={reel.name}>
      <MapTiles center={{ lng: reel.lng, lat: reel.lat }} height={height} width={width} zoom={zoom} />
      <Pin label={shortName(reel)} progress={pin} x={width / 2} y={height / 2} />
    </MapFrame>
  );
}

/** Quick cuts through the place's photos with a mono counter, like flicking through a camera roll. */
function Gallery({ reel, photos }: { reel: Reel; photos: Photo[] }) {
  return (
    <AbsoluteFill>
      {photos.map((photo, i) => (
        <Sequence durationInFrames={GALLERY_SHOT} from={i * GALLERY_SHOT} key={photo.url}>
          <PhotoFill from={1.12} photo={photo} to={1.02} />
          <AbsoluteFill style={{ padding: "130px 80px", justifyContent: "space-between" }}>
            <Label style={{ color: WHITE }}>
              {String(i + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
            </Label>
            <div>
              <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3 }}>Around {shortName(reel)}</div>
              <Credit photo={photo} />
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function Beat({ beat }: { beat: Reel["beats"][number] }) {
  const shot = Math.max(1, beat.photos.length);
  const per = Math.ceil(BEAT / shot);
  return (
    <AbsoluteFill>
      {beat.photos.length ? (
        beat.photos.map((photo, i) => (
          <Sequence durationInFrames={i === shot - 1 ? BEAT - per * i : per} from={per * i} key={photo.url}>
            <PhotoFill photo={photo} />
            <AbsoluteFill style={{ padding: "0 80px 130px", justifyContent: "flex-end" }}>
              <Credit photo={photo} />
            </AbsoluteFill>
          </Sequence>
        ))
      ) : (
        <PhotoFill photo={undefined} />
      )}
      <AbsoluteFill style={{ padding: "130px 80px 200px", justifyContent: "space-between" }}>
        <Rise>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
              background: "rgba(0,0,0,0.7)",
              border: `1px solid ${BORDER}`,
              borderRadius: 999,
              padding: "14px 30px",
              fontSize: 40,
              fontWeight: 600,
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 99, background: beat.color }} />
            <span>For {beat.name}</span>
            <span>{beat.emoji}</span>
          </div>
        </Rise>
        <div>
          <Rise delay={8}>
            <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1, letterSpacing: -3.5 }}>{beat.title}</div>
          </Rise>
          {beat.reason ? (
            <Rise delay={16}>
              <div style={{ fontSize: 42, lineHeight: 1.35, marginTop: 28, color: GREY }}>{beat.reason}</div>
            </Rise>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Row({ label, value, delay }: { label: string; value: ReactNode; delay: number }) {
  return (
    <Rise delay={delay}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 40, borderTop: `1px solid ${BORDER}`, padding: "30px 0" }}>
        <Label>{label}</Label>
        <div style={{ fontSize: 46, fontWeight: 500, textAlign: "right" }}>{value}</div>
      </div>
    </Rise>
  );
}

function Outro({ reel }: { reel: Reel }) {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [0, OUTRO], [0.35, 0.6]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Grid />
      <AbsoluteFill style={{ alignItems: "center", top: -560, opacity: glow }}>
        <Triangle color="rgba(255,255,255,0.12)" size={900} style={{ marginTop: 300, filter: "blur(2px)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ padding: "130px 80px", justifyContent: "flex-end" }}>
        <Rise>
          <Label>The plan</Label>
        </Rise>
        <Rise delay={6}>
          <div style={{ fontSize: 130, fontWeight: 700, lineHeight: 0.95, letterSpacing: -6, margin: "16px 0 60px" }}>
            {shortName(reel)}.
          </div>
        </Rise>
        <Row delay={12} label="When" value={reel.when} />
        <Row delay={16} label="Anchor" value={reel.headline} />
        <Row delay={20} label="Who" value={reel.beats.map((b) => `${b.emoji} ${b.name}`).join("  ")} />
        <Row
          delay={24}
          label="Est. cost"
          value={
            <>
              ${reel.mockCost.toLocaleString("en-US")}
              <span style={{ color: GREY, fontSize: 30 }}> · {reel.travelers} people, mock</span>
            </>
          }
        />
        <Rise delay={32} style={{ marginTop: 50, display: "flex", gap: 20 }}>
          <div style={{ background: "#fff", color: "#000", borderRadius: 999, padding: "22px 40px", fontSize: 38, fontWeight: 600, display: "flex", alignItems: "center", gap: 16 }}>
            <Triangle color="#000" size={26} /> Plan it with Travel Buddy
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
