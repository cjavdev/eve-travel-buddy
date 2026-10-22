"use client";

import { ChevronLeftIcon, ChevronRightIcon, MaximizeIcon, MinimizeIcon } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import type { TripDeck } from "@/agent/lib/itinerary";
import { cn } from "@/lib/utils";
import { MAP_ATTRIBUTION, MapTiles, project, toScreen } from "@/remotion/map";

type Day = TripDeck["days"][number];
type Stop = Day["stops"][number];

// The plan_days tool's output as a slide deck: a cover, one interactive slide per day
// (map of the day's stops, photos, who each stop is for), and a summary. Arrow keys,
// swipes, the dots, and the day tabs all move between slides.
export function TripSlides({ deck }: { readonly deck: TripDeck }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const swipe = useRef<number | null>(null);
  const count = deck.days.length + 2;
  const go = (next: number) => setIndex(Math.max(0, Math.min(count - 1, next)));

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") go(index + 1);
    if (event.key === "ArrowLeft") go(index - 1);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") swipe.current = event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (swipe.current === null) return;
    const dx = event.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen();
  };

  const tabs = ["Trip", ...deck.days.map((d) => `Day ${d.day}`), "Plan"];

  return (
    <div
      className={cn(
        "dark flex w-full flex-col overflow-hidden rounded-xl border border-white/15 bg-black text-[#ededed] outline-none",
        fullscreen ? "h-dvh rounded-none" : "h-[min(720px,85dvh)] md:h-[620px]",
      )}
      onKeyDown={onKey}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      ref={root}
      tabIndex={0}
    >
      <div className="flex items-center gap-1 overflow-x-auto border-white/15 border-b px-3 py-2 [scrollbar-width:none]">
        {tabs.map((tab, i) => (
          <button
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 font-mono text-xs uppercase tracking-wider transition-colors",
              i === index ? "bg-white text-black" : "text-[#a1a1a1] hover:bg-white/10 hover:text-white",
            )}
            key={tab}
            onClick={() => go(i)}
            type="button"
          >
            {tab}
          </button>
        ))}
        <button
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          className="ml-auto shrink-0 rounded-md p-1.5 text-[#a1a1a1] hover:bg-white/10 hover:text-white"
          onClick={toggleFullscreen}
          type="button"
        >
          {fullscreen ? <MinimizeIcon className="size-4" /> : <MaximizeIcon className="size-4" />}
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {index === 0 ? <Cover deck={deck} onStart={() => go(1)} /> : null}
        {deck.days.map((day, i) => (index === i + 1 ? <DaySlide day={day} deck={deck} key={day.day} /> : null))}
        {index === count - 1 ? <Summary deck={deck} onPick={go} /> : null}
      </div>

      <div className="flex items-center justify-between border-white/15 border-t px-3 py-2">
        <NavButton disabled={index === 0} label="Previous slide" onClick={() => go(index - 1)}>
          <ChevronLeftIcon className="size-4" />
        </NavButton>
        <div className="flex gap-1.5">
          {tabs.map((tab, i) => (
            <button
              aria-label={`Go to ${tab}`}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-white" : "w-1.5 bg-white/30")}
              key={tab}
              onClick={() => go(i)}
              type="button"
            />
          ))}
        </div>
        <NavButton disabled={index === count - 1} label="Next slide" onClick={() => go(index + 1)}>
          <ChevronRightIcon className="size-4" />
        </NavButton>
      </div>
    </div>
  );
}

function NavButton({ children, disabled, label, onClick }: { children: React.ReactNode; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className="rounded-md border border-white/15 p-1.5 text-white hover:bg-white/10 disabled:opacity-30"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[#a1a1a1] text-xs uppercase tracking-wider", className)}>{children}</p>;
}

function PhotoCredit({ photo }: { photo: Stop["photo"] }) {
  if (!photo) return null;
  return (
    <a className="font-mono text-[10px] text-white/50 hover:text-white" href={photo.pageUrl} rel="noreferrer" target="_blank">
      Photo · {photo.credit}
    </a>
  );
}

function Cover({ deck, onStart }: { deck: TripDeck; onStart: () => void }) {
  const stops = deck.days.reduce((n, d) => n + d.stops.length, 0);
  return (
    <div className="absolute inset-0">
      {deck.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="absolute inset-0 size-full object-cover" src={deck.cover.url} />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
      <div className="relative flex h-full flex-col justify-end gap-4 p-6 md:p-10">
        <Label>Travel Buddy · Day-by-day plan</Label>
        <h2 className="font-semibold text-5xl tracking-tighter md:text-7xl">{deck.name.split(",")[0]}.</h2>
        <p className="text-lg md:text-xl">{deck.headline}</p>
        <Label>
          {deck.when}
          {deck.confirmedDate ? "" : " · usual month"} · {deck.days.length} days · {stops} stops
        </Label>
        <div className="flex flex-wrap gap-2">
          {deck.party.map((p) => (
            <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-sm" key={p.id}>
              {p.emoji} {p.name}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4">
          <button className="rounded-full bg-white px-4 py-2 font-medium text-black text-sm hover:bg-white/90" onClick={onStart} type="button">
            ▲ Start with day 1
          </button>
          <PhotoCredit photo={deck.cover} />
        </div>
      </div>
    </div>
  );
}

function DaySlide({ day, deck }: { day: Day; deck: TripDeck }) {
  const [selected, setSelected] = useState(0);
  const stop = day.stops[selected];
  const party = new Map(deck.party.map((p) => [p.id, p]));
  if (day.error || day.stops.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col justify-center gap-3 p-8">
        <Label>
          Day {day.day} · {formatDate(day.date)}
        </Label>
        <h3 className="font-semibold text-3xl tracking-tight">{day.theme}</h3>
        <p className="text-[#a1a1a1]">The researcher for this day didn&apos;t come back ({day.error}). Ask Travel Buddy to plan this day again.</p>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 grid grid-rows-[40%_1fr] md:grid-cols-[1.1fr_1fr] md:grid-rows-1">
      <DayMap onSelect={setSelected} selected={selected} stops={day.stops} />
      <div className="flex min-h-0 flex-col border-white/15 border-t md:border-t-0 md:border-l">
        <div className="relative h-36 shrink-0 overflow-hidden bg-[#0a0a0a] md:h-44">
          {stop?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={stop.name} className="size-full object-cover" key={stop.photo.url} src={stop.photo.url} />
          ) : (
            <div className="flex size-full items-center justify-center text-5xl text-white/20">▲</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute right-3 bottom-2 left-4 flex items-end justify-between gap-3">
            <p className="truncate font-medium text-sm">{stop?.name}</p>
            <PhotoCredit photo={stop?.photo ?? null} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          <Label>
            Day {day.day} · {formatDate(day.date)}
          </Label>
          <h3 className="mt-1 font-semibold text-2xl tracking-tight">{day.theme}</h3>
          {day.summary ? <p className="mt-1 text-[#a1a1a1] text-sm">{day.summary}</p> : null}
          <ol className="mt-4 space-y-1">
            {day.stops.map((s, i) => (
              <li key={`${s.time}-${s.name}`}>
                <button
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    i === selected ? "border-white/40 bg-white/[0.06]" : "border-transparent hover:bg-white/[0.04]",
                  )}
                  onClick={() => setSelected(i)}
                  type="button"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="w-16 shrink-0 font-mono text-[#a1a1a1] text-xs">{s.time}</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-auto shrink-0 text-sm" title={s.who.map((id) => party.get(id)?.name ?? id).join(", ")}>
                      {s.who.map((id) => party.get(id)?.emoji ?? "").join("")}
                    </span>
                  </div>
                  {i === selected ? <p className="mt-1.5 pl-[76px] text-[#a1a1a1] text-sm">{s.what}</p> : null}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** The day's stops on the black-and-white map, fitted to fit them all. Click a pin to select it. */
function DayMap({ stops, selected, onSelect }: { stops: Stop[]; selected: number; onSelect: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { width, height } = size;
  const lngs = stops.map((s) => s.lng);
  const lats = stops.map((s) => s.lat);
  const center = { lng: (Math.min(...lngs) + Math.max(...lngs)) / 2, lat: (Math.min(...lats) + Math.max(...lats)) / 2 };
  const a = project({ lng: Math.min(...lngs), lat: Math.max(...lats) }, 0);
  const b = project({ lng: Math.max(...lngs), lat: Math.min(...lats) }, 0);
  const fit = Math.min(Math.log2((width * 0.7) / Math.max(1e-6, b.x - a.x)), Math.log2((height * 0.65) / Math.max(1e-6, b.y - a.y)));
  const zoom = Math.max(3, Math.min(14, Number.isFinite(fit) ? fit : 13));

  return (
    <div className="relative min-h-0 overflow-hidden bg-black" ref={box}>
      {width > 0 ? <MapTiles center={center} height={height} width={width} zoom={zoom} /> : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {width > 0
        ? stops.map((s, i) => {
            const p = toScreen(s, center, zoom, width, height);
            const active = i === selected;
            return (
              <button
                aria-label={`${s.time} ${s.name}`}
                className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
                key={`${s.time}-${s.name}`}
                onClick={() => onSelect(i)}
                style={{ left: p.x, top: p.y, zIndex: active ? 2 : 1 }}
                type="button"
              >
                <span
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 font-mono text-[11px]",
                    active ? "border-white bg-white text-black" : "border-white/20 bg-black text-[#a1a1a1]",
                  )}
                >
                  {i + 1}
                  {active ? ` · ${s.name}` : ""}
                </span>
                <svg
                  className={active ? "drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" : ""}
                  height={active ? 18 : 12}
                  viewBox="0 0 100 86.6"
                  width={active ? 21 : 14}
                >
                  <polygon fill={active ? "#fff" : "#a1a1a1"} points="50,0 100,86.6 0,86.6" />
                </svg>
              </button>
            );
          })
        : null}
      <p className="absolute bottom-1.5 left-2 font-mono text-[9px] text-white/40">{MAP_ATTRIBUTION}</p>
    </div>
  );
}

function Summary({ deck, onPick }: { deck: TripDeck; onPick: (i: number) => void }) {
  return (
    <div className="absolute inset-0 overflow-y-auto p-6 md:p-10">
      <Label>The plan</Label>
      <h3 className="mt-1 font-semibold text-4xl tracking-tighter">{deck.name.split(",")[0]}.</h3>
      <div className="mt-6 divide-y divide-white/15 border-white/15 border-y">
        {deck.days.map((d, i) => (
          <button
            className="flex w-full items-baseline gap-4 py-3 text-left hover:bg-white/[0.04]"
            key={d.day}
            onClick={() => onPick(i + 1)}
            type="button"
          >
            <span className="w-24 shrink-0 font-mono text-[#a1a1a1] text-xs uppercase">
              Day {d.day} · {formatDate(d.date)}
            </span>
            <span className="font-medium">{d.theme}</span>
            <span className="ml-auto hidden shrink-0 text-[#a1a1a1] text-sm sm:inline">{d.stops.length} stops</span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <Label>Est. cost</Label>
        <p className="text-xl">
          ${deck.mockCost.toLocaleString("en-US")} <span className="text-[#a1a1a1] text-sm">· {deck.travelers} people, mock flights + hotel</span>
        </p>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short", timeZone: "UTC" });
}
