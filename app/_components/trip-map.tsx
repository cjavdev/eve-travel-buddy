"use client";

import { MessageCircleIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TripPlans } from "@/agent/lib/trips";
import { PARTY } from "@/agent/lib/data/party";
import { monthName } from "@/agent/lib/planner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false });

const STATUS_LABEL = {
  live: "live",
  fallback: "offline, using typical months",
  off: "add TICKETMASTER_KEY for live shows",
} as const;

const money = (n: number) => (n === 0 ? "drive" : `$${n.toLocaleString()}`);

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
          colors: plan.people.map((p) => p.color),
          tooltip: plan.window ? `${plan.window.label} · ${plan.window.title}` : plan.place.name,
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
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5">
        <h1 className="font-semibold text-lg tracking-tight">Bucket-list map</h1>
        <div aria-label="Filter by who's going" className="flex flex-wrap gap-2">
          {PARTY.map((p) => (
            <button
              aria-pressed={active.has(p.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-opacity",
                !active.has(p.id) && "opacity-40",
              )}
              key={p.id}
              onClick={() => toggle(p.id)}
              type="button"
            >
              <span className="size-2.5 rounded-full" style={{ background: p.color }} />
              {p.emoji} {p.name}
            </button>
          ))}
        </div>
        <Button asChild className="ml-auto" size="sm" variant="outline">
          <a href="/s">
            <MessageCircleIcon className="size-4" />
            Ask Travel Buddy
          </a>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-[300px] flex-1">
          <LeafletMap onSelect={onSelect} pins={pins} selectedId={selectedId} />
        </div>
        <aside className="max-h-[50vh] overflow-y-auto border-t p-4 md:max-h-none md:w-96 md:border-t-0 md:border-l">
          {error ? (
            <p className="text-destructive text-sm">Couldn't load trips: {error}</p>
          ) : !data ? (
            <p className="text-muted-foreground text-sm">Checking race calendars and weather…</p>
          ) : !selected ? (
            <p className="text-muted-foreground text-sm">Pick a pin to see the best upcoming window and who it's for.</p>
          ) : (
            <PlaceDetails home={data.home.code} plan={selected} />
          )}
        </aside>
      </div>

      <footer className="border-t px-4 py-1.5 text-muted-foreground text-xs">
        {data
          ? `Races (F1 dates from Jolpica): ${STATUS_LABEL[data.sources.racing]} · Ride weather (Open-Meteo): ${STATUS_LABEL[data.sources.weather]} · Shows (Ticketmaster): ${STATUS_LABEL[data.sources.shows]} · Flights and hotels: mock`
          : "Loading data sources…"}
      </footer>
    </main>
  );
}

function PlaceDetails({ plan, home }: { readonly plan: TripPlans["plans"][number]; readonly home: string }) {
  const { place, people, window: w, trip, travelers } = plan;
  if (!w) return <h2 className="font-semibold text-xl">{place.name}</h2>;
  const dates = w.start ? (w.start === w.end ? w.start : `${w.start} to ${w.end}`) : `Sometime in ${monthName(w.month)}`;
  const prompt = `Plan a trip to ${place.name} around ${w.title} in ${monthName(w.month)} ${w.year}. Who should come, and what should we do each day?`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-xl">{place.name}</h2>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {people.map((p) => (
            <span className="rounded-full px-2 py-0.5 text-white text-xs" key={p.id} style={{ background: p.color }}>
              {p.emoji} {p.name}
            </span>
          ))}
        </div>
      </div>

      <section className="rounded-lg border p-3">
        <p className="text-muted-foreground text-sm">Best upcoming window</p>
        <p className="font-bold text-2xl">
          {monthName(w.month)} {w.year}
        </p>
        <p className="font-medium">
          {w.title}{" "}
          {w.url ? (
            <a className="text-sky-600 text-sm underline" href={w.url} rel="noopener" target="_blank">
              details
            </a>
          ) : null}{" "}
          <Badge variant={w.live ? "default" : "secondary"}>{w.live ? "live data" : "typical"}</Badge>
        </p>
        <p className="text-muted-foreground text-sm">{dates}</p>
        <ul className="mt-3 grid gap-2">
          {w.who.map((f) => (
            <li className="flex gap-2 text-sm" key={f.person.id}>
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: f.person.color }} />
              <span className={cn(!f.strong && "text-muted-foreground")}>
                <strong>{f.person.name}:</strong> {f.reason}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-medium">
          Rough cost from {home} <Badge variant="secondary">mock</Badge>
        </h3>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
          <dt>Flights × {travelers}</dt>
          <dd>{money(trip.flightPerPerson * travelers)}</dd>
          <dt>Hotel, 3 nights</dt>
          <dd>{money(trip.hotelPerNight * 3)}</dd>
          <dt className="font-semibold">Total</dt>
          <dd className="font-semibold">{money(trip.total)}</dd>
        </dl>
      </section>

      <p className="text-muted-foreground text-sm">{place.notes}</p>

      <Button asChild>
        <a href={`/s?q=${encodeURIComponent(prompt)}`}>
          <MessageCircleIcon className="size-4" />
          Plan this with Travel Buddy
        </a>
      </Button>
    </div>
  );
}
