import { useEffect, useRef } from 'react';
import { Map, Marker, NavigationControl, setWorkerUrl, type MapMouseEvent, type StyleSpecification } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

// The library asks for a sibling worker file Vite does not emit, so vector
// tiles never draw and the canvas stays the positron paper colour.
setWorkerUrl(maplibreWorkerUrl);
import type { Locality, Report } from '../data/types';
import { localities as allLocalities } from '../data/localities';
import { electoralWards } from '../data/electoralWards';
import { loadWardGeoJSON, wardIdAt } from '../lib/wardsGeo';
import './MapView.css';

export type UnmappedWard = { id: number; name: string };

interface Props {
  reports: Report[];
  localities: Locality[];
  selectedId?: string | null;
  onSelectLocality: (id: string) => void;
  onUnmappedWard?: (ward: UnmappedWard) => void;
  onSelectReport?: (id: string) => void;
  focus?: { lat: number; lng: number } | null;
  selectedWardId?: number | null;
}

const STATUS_COLOR: Record<Report['status'], string> = {
  open: '#c62828',
  escalated: '#a67c00',
  resolved: '#2a7d5a',
};

type MapCanvas = HTMLDivElement & {
  __hisabMap?: Map;
};

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const MAP_ATTRIBUTION = '© OpenMapTiles / © OpenStreetMap contributors / OpenFreeMap';
const STYLE_TIMEOUT_MS = 7_000;
const OSM_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'paper', type: 'background', paint: { 'background-color': '#f4f6f4' } },
    { id: 'osm', type: 'raster', source: 'osm' },
  ],
};
/** Pre-#40 city frame. Phones sit slightly closer so the zoom control stays clear. */
const DESKTOP_ZOOM = 11.2;
const NARROW_ZOOM = 11.8;

function controlRect(el: Element | null): DOMRect | null {
  if (!el) return null;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  return rect;
}

function localityZoom(container: HTMLElement) {
  return container.clientWidth < 700 ? NARROW_ZOOM : DESKTOP_ZOOM;
}

/**
 * Desktop keeps a short left and bottom inset so a marker on the logo
 * clears it without shifting the city. A phone clears the zoom control
 * from the right. A tall top pad pushes other markers onto that control.
 */
function chromeCameraPadding(container: HTMLElement) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width < 80 || height < 80) return { top: 0, right: 0, bottom: 0, left: 0 };
  if (width >= 700) return { top: 0, right: 0, bottom: 32, left: 24 };

  const canvas = container.getBoundingClientRect();
  const zoom = controlRect(container.querySelector('.maplibregl-ctrl-top-right'));
  const attrib = controlRect(container.querySelector('.maplibregl-ctrl-bottom-right'));
  const intoRight = (rect: DOMRect | null) => (rect ? Math.max(0, canvas.right - rect.left) : 0);
  const right = Math.max(intoRight(zoom), intoRight(attrib), 80);
  return { top: 0, right: Math.round(right), bottom: 0, left: 0 };
}

function wardDisplayName(wardId: number, geoName?: unknown): string {
  const roster = electoralWards.find((w) => w.id === wardId);
  if (roster?.name) return roster.name;
  if (typeof geoName === 'string' && geoName.trim()) return geoName;
  return `Ward ${wardId}`;
}

export function MapView({
  reports,
  localities,
  selectedId,
  onSelectLocality,
  onUnmappedWard,
  onSelectReport,
  focus,
  selectedWardId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const localityMarkersRef = useRef<Marker[]>([]);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const flyRef = useRef<() => void>(() => {});
  const selectRef = useRef(onSelectLocality);
  selectRef.current = onSelectLocality;
  const unmappedRef = useRef(onUnmappedWard);
  unmappedRef.current = onUnmappedWard;
  const selectedWardRef = useRef(selectedWardId);
  selectedWardRef.current = selectedWardId;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [73.8567, 18.5204],
      zoom: 11.2,
      attributionControl: {
        compact: true,
        customAttribution: MAP_ATTRIBUTION,
      },
      maplibreLogo: true,
    });

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    (containerRef.current as MapCanvas).__hisabMap = map;

    let flight = 0;
    const flyToFocus = () => {
      const container = containerRef.current;
      const target = focusRef.current;
      if (!container || !target) return;
      const token = ++flight;
      map.flyTo({
        center: [target.lng, target.lat],
        zoom: localityZoom(container),
        essential: true,
        padding: chromeCameraPadding(container),
      });
      map.once('moveend', () => {
        if (token !== flight || !containerRef.current) return;
        const padding = chromeCameraPadding(containerRef.current);
        const current = map.getPadding();
        const drift =
          Math.abs((current.top ?? 0) - padding.top) +
          Math.abs((current.right ?? 0) - padding.right) +
          Math.abs((current.bottom ?? 0) - padding.bottom) +
          Math.abs((current.left ?? 0) - padding.left);
        if (drift > 1) map.setPadding(padding);
      });
    };
    flyRef.current = flyToFocus;
    map.on('resize', () => {
      if (!containerRef.current || map.isMoving()) return;
      map.setPadding(chromeCameraPadding(containerRef.current));
    });
    flyToFocus();

    let wardData: Awaited<ReturnType<typeof loadWardGeoJSON>> | null = null;
    let wardClicksBound = false;
    let wardChain = Promise.resolve();
    let styleReady = false;
    let fellBack = false;
    let attribCollapsed = false;

    const reattachMarkers = () => {
      for (const marker of [...localityMarkersRef.current, ...markersRef.current]) {
        marker.addTo(map);
      }
    };

    const ensureWards = () => {
      wardChain = wardChain
        .then(async () => {
          wardData = wardData ?? (await loadWardGeoJSON());
          if (!styleReady || !map.getStyle()) return;
          if (!map.getSource('wards')) {
            map.addSource('wards', { type: 'geojson', data: wardData });
            map.addLayer({
              id: 'wards-fill',
              type: 'fill',
              source: 'wards',
              paint: {
                'fill-color': '#0c1a17',
                'fill-opacity': 0.06,
              },
            });
            map.addLayer({
              id: 'wards-line',
              type: 'line',
              source: 'wards',
              paint: {
                'line-color': '#0c1a17',
                'line-width': 1,
                'line-opacity': 0.45,
              },
            });
            map.addLayer({
              id: 'wards-selected',
              type: 'fill',
              source: 'wards',
              filter: ['==', ['get', 'wardId'], -1],
              paint: {
                'fill-color': '#c62828',
                'fill-opacity': 0.16,
              },
            });
          }
          if (map.getLayer('wards-selected')) {
            map.setFilter('wards-selected', ['==', ['get', 'wardId'], selectedWardRef.current ?? -1]);
          }
          if (wardClicksBound || !map.getLayer('wards-fill')) return;
          wardClicksBound = true;
          // Point-in-polygon on the click lng/lat. Layer queryRenderedFeatures is
          // empty while tiles/WebGL are still settling, which made polygon
          // clicks a silent no-op.
          map.on('click', (e: MapMouseEvent) => {
            if (!wardData) return;
            const wardId = wardIdAt(e.lngLat.lng, e.lngLat.lat, wardData);
            if (wardId == null) return;
            const match = allLocalities.find((l) => l.electoralWardId === wardId);
            if (match) {
              selectRef.current(match.id);
              return;
            }
            const geoName = wardData.features.find((f) => f.properties.wardId === wardId)?.properties.name;
            unmappedRef.current?.({
              id: wardId,
              name: wardDisplayName(wardId, geoName),
            });
          });
          map.on('mouseenter', 'wards-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'wards-fill', () => {
            map.getCanvas().style.cursor = '';
          });
        })
        .catch(() => {
          // Markers still work if ward GeoJSON fails to load.
        });
    };

    let styleTimer = 0;
    const fallBackStyle = () => {
      if (fellBack || styleReady) return;
      fellBack = true;
      window.clearTimeout(styleTimer);
      map.setStyle(OSM_FALLBACK_STYLE);
    };

    // style.load fires for the remote style and again for the fallback JSON.
    // Map `load` fires only once, and never if the style URL fails.
    map.on('style.load', () => {
      styleReady = true;
      window.clearTimeout(styleTimer);
      if (!attribCollapsed) {
        attribCollapsed = true;
        map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      }
      flyToFocus();
      reattachMarkers();
      ensureWards();
    });
    map.on('error', (event) => {
      if (styleReady || fellBack) return;
      const message = event.error instanceof Error ? event.error.message : String(event.error ?? '');
      if (/shader|webgl|program failed to link|could not compile/i.test(message)) return;
      fallBackStyle();
    });
    styleTimer = window.setTimeout(fallBackStyle, STYLE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(styleTimer);
      markersRef.current.forEach((m) => m.remove());
      localityMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // Map boot once; callbacks read latest via markers effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('wards-selected')) return;
    const wid = selectedWardId ?? -1;
    map.setFilter('wards-selected', ['==', ['get', 'wardId'], wid]);
  }, [selectedWardId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    localityMarkersRef.current.forEach((m) => m.remove());
    localityMarkersRef.current = localities.map((loc) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `map-loc ${selectedId === loc.id ? 'is-active' : ''}`;
      el.title = loc.name;
      el.dataset.lng = String(loc.lng);
      el.dataset.lat = String(loc.lat);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectLocality(loc.id);
      });
      return new Marker({ element: el, anchor: 'center' })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);
    });
  }, [localities, selectedId, onSelectLocality]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = reports
      .filter((r) => r.status !== 'resolved')
      .map((report) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'map-pin';
        el.style.setProperty('--pin', STATUS_COLOR[report.status]);
        el.title = report.note;
        el.dataset.lng = String(report.lng);
        el.dataset.lat = String(report.lat);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectLocality(report.localityId);
          onSelectReport?.(report.id);
        });
        return new Marker({ element: el, anchor: 'center' })
          .setLngLat([report.lng, report.lat])
          .addTo(map);
      });
  }, [reports, onSelectLocality, onSelectReport]);

  useEffect(() => {
    flyRef.current();
  }, [focus]);

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-shell__canvas" />
      <div className="map-shell__legend">
        <span>
          <i style={{ background: STATUS_COLOR.open }} /> Open
        </span>
        <span>
          <i style={{ background: STATUS_COLOR.escalated }} /> Escalated
        </span>
        <span>
          <i className="map-shell__dot" /> Locality
        </span>
        <span>41 ward polygons (2026 election)</span>
      </div>
    </div>
  );
}
