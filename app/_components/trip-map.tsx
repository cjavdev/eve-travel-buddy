"use client";

import { ArrowUpRightIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TripPlans } from "@/agent/lib/trips";
import { PARTY } from "@/agent/lib/data/party";
import { monthName } from "@/agent/lib/planner";
import { cn } from "@/lib/utils";

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false });

const STATUS_LABEL = {
  live: "live",
  fallback: "typical months",
  mock: "mock",
} as const;

const money = (n: number) => (n === 0 ? "drive" : `$${n.toLocaleString()}`);

function Triangle({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 76 65">
      <path d="M37.6 0L75.2 65H0z" fill="currentColor" />
    </svg>
  );
}

function Eyebrow({ children }: { readonly children: React.ReactNode }) {
  return <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.08em]">{children}</p>;
}

export function TripMap() {
  const [data, setData] = useState<TripPlans>();
  const [error, setError] = useState<string>();
  const [active, setActive] = useState(() => new Set(PARTY.map((p) => p.id)));
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    fetch("/api/trips")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const pins = useMemo(
    () =>
      (data?.plans ?? [])
        .filter((plan) => plan.people.some((p) => active.has(p.id)))
        .map((plan) => ({
          id: plan.place.id,
          name: plan.place.name,
          lat: plan.place.lat,
          lng: plan.place.lng,
          weight: plan.people.length,
          tooltip: plan.window ? `${monthName(plan.window.month)} ${plan.window.year} · ${plan.window.title}` : plan.place.name,
        })),
    [data, active],
  );
  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const selected = data?.plans.find((p) => p.place.id === selectedId);

  const toggle = (id: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <main className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <Triangle className="size-5 text-foreground" />
        <span className="text-muted-foreground/50 text-xl font-extralight">/</span>
        <span className="font-medium text-sm">Travel Buddy</span>
        <span className="hidden text-muted-foreground/50 text-xl font-extralight sm:inline">/</span>
        <span className="hidden text-muted-foreground text-sm sm:inline">Bucket list</span>
        <a
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 font-medium text-background text-sm transition-opacity hover:opacity-85"
          href="/s"
        >
          Ask Travel Buddy
          <ArrowUpRightIcon className="size-3.5" />
        </a>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-[320px] flex-1 overflow-hidden">
          <LeafletMap onSelect={onSelect} pins={pins} selectedId={selectedId} />
          {/* Vercel-style grid and vignette over the map. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[400] opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[400]"
            style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / 0.75) 100%)" }}
          />

          <div className="absolute top-4 left-4 z-[500] flex flex-col gap-3">
            <div>
              <h1 className="font-semibold text-3xl tracking-[-0.04em] sm:text-4xl">Where to next.</h1>
              <p className="mt-1 max-w-xs text-muted-foreground text-sm">
                Every place on the list, timed to the races, shows, rides, and beach days.
              </p>
            </div>
            <div
              aria-label="Filter by who's going"
              className="flex w-fit max-w-[calc(100vw-2rem)] flex-wrap rounded-lg border border-[#2e2e2e] bg-black/70 p-1 backdrop-blur"
            >
              {PARTY.map((p) => (
                <button
                  aria-pressed={active.has(p.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors",
                    active.has(p.id) ? "bg-[#1f1f1f] text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  type="button"
                >
                  <span className="size-1.5 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="max-h-[55vh] overflow-y-auto border-t bg-background md:max-h-none md:w-[400px] md:border-t-0 md:border-l">
          {error ? (
            <p className="p-6 text-destructive text-sm">Couldn't load trips: {error}</p>
          ) : !data ? (
            <div className="p-6">
              <Eyebrow>Loading</Eyebrow>
              <p className="mt-2 text-muted-foreground text-sm">Checking race calendars and weather…</p>
            </div>
          ) : !selected ? (
            <PlaceList data={data} onSelect={onSelect} />
          ) : (
            <PlaceDetails home={data.home.code} onBack={() => setSelectedId(undefined)} plan={selected} />
          )}
        </aside>
      </div>

      <footer className="flex h-9 shrink-0 items-center gap-4 overflow-x-auto whitespace-nowrap border-t px-4 font-mono text-[11px] text-muted-foreground sm:px-6">
        {data ? (
          <>
            <Status label="Races · Jolpica" state={data.sources.racing} />
            <Status label="Weather · Open-Meteo" state={data.sources.weather} />
            <Status label="Shows · Ticketmaster" state={data.sources.shows} />
            <span>Flights + hotels · mock</span>
          </>
        ) : (
          "Loading data sources…"
        )}
      </footer>
    </main>
  );
}

function Status({ label, state }: { readonly label: string; readonly state: keyof typeof STATUS_LABEL }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", state === "live" ? "bg-foreground" : "bg-[#444]")} />
      {label} <span className="text-[#666]">{STATUS_LABEL[state]}</span>
    </span>
  );
}

function PlaceList({ data, onSelect }: { readonly data: TripPlans; readonly onSelect: (id: string) => void }) {
  return (
    <div className="p-6">
      <Eyebrow>Bucket list · {data.plans.length} places</Eyebrow>
      <ul className="mt-4 divide-y divide-[#1f1f1f] border-y border-[#1f1f1f]">
        {data.plans.map(({ place, window: w, people }) => (
          <li key={place.id}>
            <button
              className="group flex w-full items-center gap-3 py-4 text-left"
              onClick={() => onSelect(place.id)}
              type="button"
            >
              <Triangle className="size-3 shrink-0 text-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-sm">{place.name}</span>
                <span className="block truncate text-muted-foreground text-xs">
                  {w ? `${monthName(w.month)} ${w.year} · ${w.title}` : "No window yet"}
                </span>
              </span>
              <span className="flex -space-x-1">
                {people.map((p) => (
                  <span className="size-2.5 rounded-full ring-2 ring-black" key={p.id} style={{ background: p.color }} />
                ))}
              </span>
              <ArrowUpRightIcon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlaceDetails({
  plan,
  home,
  onBack,
}: {
  readonly plan: TripPlans["plans"][number];
  readonly home: string;
  readonly onBack: () => void;
}) {
  const { place, window: w, trip, travelers } = plan;
  if (!w) return <h2 className="p-6 font-semibold text-xl">{place.name}</h2>;
  const dates = w.start ? (w.start === w.end ? w.start : `${w.start} → ${w.end}`) : `Sometime in ${monthName(w.month)}`;
  const prompt = `Plan a trip to ${place.name} around ${w.title} in ${monthName(w.month)} ${w.year}. Who should come, and what should we do each day?`;

  return (
    <div className="flex flex-col gap-6 p-6">
      <button className="w-fit font-mono text-[11px] text-muted-foreground uppercase tracking-[0.08em] hover:text-foreground" onClick={onBack} type="button">
        ← All places
      </button>

      <div>
        <h2 className="font-semibold text-2xl tracking-[-0.03em]">{place.name}</h2>
        <p className="mt-1 text-muted-foreground text-sm">{place.notes}</p>
      </div>

      <section className="rounded-lg border border-[#2e2e2e] bg-[#0a0a0a]">
        <div className="border-[#1f1f1f] border-b p-4">
          <div className="flex items-center justify-between">
            <Eyebrow>Best upcoming window</Eyebrow>
            <span className="rounded-full border border-[#2e2e2e] px-2 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
              {w.mock ? "mock" : w.live ? "live" : "typical"}
            </span>
          </div>
          <p className="mt-2 font-semibold text-4xl tracking-[-0.04em]">
            {monthName(w.month)} {w.year}
          </p>
          <p className="mt-1 text-sm">
            {w.title}
            {w.url ? (
              <a className="ml-1.5 inline-flex items-center text-muted-foreground hover:text-foreground" href={w.url} rel="noopener" target="_blank">
                <ArrowUpRightIcon className="size-3.5" />
              </a>
            ) : null}
          </p>
          <p className="mt-0.5 font-mono text-muted-foreground text-xs">{dates}</p>
        </div>
        <ul className="divide-y divide-[#1f1f1f]">
          {w.who.map((f) => (
            <li className="flex gap-3 px-4 py-3 text-sm" key={f.person.id}>
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: f.person.color }} />
              <span className={cn(!f.strong && "text-muted-foreground")}>
                <span className="font-medium text-foreground">{f.person.name}</span>
                <span className="text-muted-foreground"> — {f.reason}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <Eyebrow>Rough cost from {home} · mock</Eyebrow>
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 font-mono text-sm">
          <dt className="text-muted-foreground">Flights × {travelers}</dt>
          <dd>{money(trip.flightPerPerson * travelers)}</dd>
          <dt className="text-muted-foreground">Hotel × 3 nights</dt>
          <dd>{money(trip.hotelPerNight * 3)}</dd>
          <dt className="border-[#1f1f1f] border-t pt-2">Total</dt>
          <dd className="border-[#1f1f1f] border-t pt-2 font-semibold">{money(trip.total)}</dd>
        </dl>
      </section>

      <a
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground font-medium text-background text-sm transition-opacity hover:opacity-85"
        href={`/s?q=${encodeURIComponent(prompt)}`}
      >
        Plan this with Travel Buddy
        <ArrowUpRightIcon className="size-4" />
      </a>
    </div>
  );
}
