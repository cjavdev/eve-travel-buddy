import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';
import { PARTY, HOME, peopleFor } from './data/party.js';
import { BUCKET_LIST } from './data/bucketList.js';
import { fetchF1Calendar } from './sources/f1.js';
import { fetchRideClimate } from './sources/weather.js';
import { fetchShows, hasTicketmasterKey } from './sources/shows.js';
import { mockTrip } from './sources/mockTravel.js';
import { bestWindow, monthName } from './planner.js';

const state = {
  today: new Date(),
  races: [],
  shows: {},
  climate: {},
  active: new Set(PARTY.map((p) => p.id)),
  selected: null,
  sources: { racing: 'loading', weather: 'loading', shows: hasTicketmasterKey ? 'loading' : 'off' },
};

const map = L.map('map', { worldCopyJump: true }).setView([35, -40], 3);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

function pinIcon(place, selected) {
  const colors = peopleFor(place.interests).map((p) => p.color);
  const step = 100 / colors.length;
  const stops = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ');
  return L.divIcon({
    className: '',
    html: `<div class="pin${selected ? ' selected' : ''}" style="background: conic-gradient(${stops})"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const windowFor = (place) =>
  bestWindow(place, {
    today: state.today,
    races: state.races,
    shows: state.shows[place.id] ?? null,
    climate: state.climate[place.id] ?? null,
  });

const markers = new Map();
for (const place of BUCKET_LIST) {
  const marker = L.marker([place.lat, place.lng], { icon: pinIcon(place, false), title: place.name })
    .addTo(map)
    .on('click', () => select(place.id));
  markers.set(place.id, marker);
}
map.fitBounds(L.latLngBounds(BUCKET_LIST.map((p) => [p.lat, p.lng])), { padding: [30, 30] });

function refreshMarkers() {
  for (const place of BUCKET_LIST) {
    const marker = markers.get(place.id);
    const visible = peopleFor(place.interests).some((p) => state.active.has(p.id));
    if (visible && !map.hasLayer(marker)) marker.addTo(map);
    if (!visible && map.hasLayer(marker)) marker.remove();
    marker.setIcon(pinIcon(place, place.id === state.selected));
    const w = windowFor(place);
    marker.unbindTooltip().bindTooltip(w ? `${w.label} · ${w.title}` : place.name, { direction: 'top', offset: [0, -12] });
  }
}

function select(id) {
  state.selected = id;
  refreshMarkers();
  renderPanel();
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const money = (n) => (n === 0 ? 'drive' : `$${n.toLocaleString()}`);

function renderPanel() {
  const panel = document.getElementById('panel');
  const place = BUCKET_LIST.find((p) => p.id === state.selected);
  if (!place) return;
  const w = windowFor(place);
  const people = peopleFor(place.interests);
  const travelers = people.reduce((n, p) => n + (p.id === 'parents' ? 2 : 1), 0);
  const trip = mockTrip(HOME, place, { travelers, nights: 3, isEventWeekend: w?.anchored });
  const dates = w?.start ? (w.start === w.end ? w.start : `${w.start} to ${w.end}`) : `Sometime in ${monthName(w.month)}`;

  panel.innerHTML = `
    <h2>${esc(place.name)}</h2>
    <div class="tags">${people.map((p) => `<span class="tag" style="background:${p.color}">${p.emoji} ${esc(p.name)}</span>`).join('')}</div>
    <section class="window">
      <div class="dates">Best upcoming window</div>
      <div class="when">${esc(monthName(w.month))} ${w.year}</div>
      <div><strong>${esc(w.title)}</strong>${w.url ? ` · <a href="${esc(w.url)}" target="_blank" rel="noopener">details</a>` : ''}
        <span class="badge${w.live ? ' live' : ''}">${w.live ? 'live data' : 'typical'}</span></div>
      <div class="dates">${esc(dates)}</div>
      <ul class="fits">
        ${w.who
          .map(
            (f) => `<li><span class="dot" style="background:${f.person.color}"></span>
              <span class="${f.strong ? '' : 'weak'}"><strong>${esc(f.person.name)}:</strong> ${esc(f.reason)}</span></li>`,
          )
          .join('')}
      </ul>
    </section>
    <h3>Rough cost from ${esc(HOME.code)} <span class="badge">mock</span></h3>
    <div class="costs">
      <span>Flights × ${travelers}</span><span>${money(trip.flightPerPerson * travelers)}</span>
      <span>Hotel, 3 nights</span><span>${money(trip.hotelPerNight * 3)}</span>
      <span class="total">Total</span><span class="total">${money(trip.total)}</span>
    </div>
    <p class="notes">${esc(place.notes)}</p>
  `;
}

function renderLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = PARTY.map(
    (p) => `<button class="chip" data-id="${p.id}" aria-pressed="${state.active.has(p.id)}">
      <span class="dot" style="background:${p.color}"></span>${p.emoji} ${esc(p.name)}</button>`,
  ).join('');
  legend.querySelectorAll('button').forEach((btn) =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      state.active.has(id) ? state.active.delete(id) : state.active.add(id);
      renderLegend();
      refreshMarkers();
    }),
  );
}

function renderStatus() {
  const label = { loading: 'loading…', live: 'live', fallback: 'offline, using typical months', off: 'add VITE_TICKETMASTER_KEY for live shows' };
  const s = state.sources;
  document.getElementById('status').textContent =
    `Racing (F1 dates from Jolpica): ${label[s.racing]} · Ride weather (Open-Meteo): ${label[s.weather]} · Shows (Ticketmaster): ${label[s.shows]} · Flights and hotels: mock`;
}

function update() {
  refreshMarkers();
  renderPanel();
  renderStatus();
}

async function loadData() {
  const f1 = fetchF1Calendar(state.today).then((races) => {
    state.races = races;
    state.sources.racing = races.length ? 'live' : 'fallback';
    update();
  });

  const bikePlaces = BUCKET_LIST.filter((p) => p.interests.includes('bike'));
  const weather = Promise.allSettled(
    bikePlaces.map((p) => fetchRideClimate(p, state.today).then((c) => { state.climate[p.id] = c; update(); })),
  ).then((results) => {
    state.sources.weather = results.some((r) => r.status === 'fulfilled') ? 'live' : 'fallback';
    update();
  });

  const theaterPlaces = BUCKET_LIST.filter((p) => p.interests.includes('theater'));
  const shows = hasTicketmasterKey
    ? Promise.allSettled(
        theaterPlaces.map((p) => fetchShows(p).then((s) => { state.shows[p.id] = s; update(); })),
      ).then((results) => {
        state.sources.shows = results.some((r) => r.status === 'fulfilled') ? 'live' : 'fallback';
        update();
      })
    : Promise.resolve();

  await Promise.allSettled([f1, weather, shows]);
}

renderLegend();
update();
loadData();
