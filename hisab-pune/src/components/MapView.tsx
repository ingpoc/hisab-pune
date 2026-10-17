import { useEffect, useRef, useState } from 'react';
import type { Map as MlMap, MapMouseEvent, Marker as MlMarker, StyleSpecification } from 'maplibre-gl';
import type { Locality, Report } from '../data/types';
import { localities as allLocalities } from '../data/localities';
import { electoralWards } from '../data/electoralWards';
import { loadWardGeoJSON, wardIdAt } from '../lib/wardsGeo';
import { slimPositronStyle } from '../lib/slimMapStyle';
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
  /** When false, maplibre waits until this flips true or the mount cap elapses. */
  bootReady?: boolean;
}

const STATUS_COLOR: Record<Report['status'], string> = {
  open: '#c62828',
  escalated: '#a67c00',
  resolved: '#2a7d5a',
};

type MapCanvas = HTMLDivElement & {
  __hisabMap?: MlMap;
};

type MapLibreApi = typeof import('maplibre-gl');

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
/** Below the library default of 16. Raster sprites and icons; vector tiles use the worker. */
const MAX_PARALLEL_IMAGE_REQUESTS = 6;
const MAX_TILE_CACHE_SIZE = 32;
/** A cold API must not hold the map forever. Measured from boot start. */
const BOOT_CAP_MS = 5_000;

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

/** How far the bottom sheet handle covers the map canvas, in px. */
function sheetHandleOverlap(container: HTMLElement): number {
  const handle = document.querySelector('.map-page__sheet-handle');
  if (!handle) return 0;
  const cs = getComputedStyle(handle);
  if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
  const handleRect = handle.getBoundingClientRect();
  if (handleRect.width < 1 || handleRect.height < 1) return 0;
  const canvas = container.getBoundingClientRect();
  const overlap = Math.min(handleRect.bottom, canvas.bottom) - Math.max(handleRect.top, canvas.top);
  return overlap > 0 ? Math.round(overlap) : 0;
}

/**
 * Desktop keeps a short left and bottom inset so a marker on the logo
 * clears it without shifting the city. A phone clears the zoom control
 * from the right and the sheet handle from the bottom.
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
  return { top: 0, right: Math.round(right), bottom: sheetHandleOverlap(container), left: 0 };
}

function wardDisplayName(wardId: number, geoName?: unknown): string {
  const roster = electoralWards.find((w) => w.id === wardId);
  if (roster?.name) return roster.name;
  if (typeof geoName === 'string' && geoName.trim()) return geoName;
  return `Ward ${wardId}`;
}

async function loadSlimPositron(signal: AbortSignal): Promise<StyleSpecification> {
  const res = await fetch(OPENFREEMAP_STYLE, { signal });
  if (!res.ok) throw new Error(`OpenFreeMap style ${res.status}`);
  const json = (await res.json()) as StyleSpecification;
  return slimPositronStyle(json);
}

function afterFirstPaint(
  onCancel: () => boolean,
  isBootReady: () => boolean,
  bindWake: (wake: () => void) => void,
): { promise: Promise<void>; cancel: () => void } {
  let idleHandle = 0;
  let timerHandle = 0;
  let capHandle = 0;
  let rafHandle = 0;
  let listening = false;
  let loaded = document.readyState === 'complete';
  let scheduled = false;
  let onLoad: (() => void) | undefined;
  const started = performance.now();

  const cancel = () => {
    if (listening && onLoad) window.removeEventListener('load', onLoad);
    if (idleHandle) window.cancelIdleCallback(idleHandle);
    if (timerHandle) window.clearTimeout(timerHandle);
    if (capHandle) window.clearTimeout(capHandle);
    if (rafHandle) window.cancelAnimationFrame(rafHandle);
    bindWake(() => {});
  };

  const promise = new Promise<void>((resolve) => {
    const idle = () => {
      if (onCancel()) return;
      const ric = window.requestIdleCallback;
      if (typeof ric === 'function') idleHandle = ric(() => resolve(), { timeout: 2000 });
      else timerHandle = window.setTimeout(resolve, 2000);
    };

    const painted = () => {
      if (onCancel()) return;
      rafHandle = window.requestAnimationFrame(() => {
        if (onCancel()) return;
        rafHandle = window.requestAnimationFrame(() => {
          rafHandle = 0;
          idle();
        });
      });
    };

    const go = () => {
      if (!loaded || onCancel() || scheduled) return;
      if (!isBootReady() && performance.now() - started < BOOT_CAP_MS) return;
      scheduled = true;
      if (capHandle) window.clearTimeout(capHandle);
      painted();
    };

    bindWake(go);
    capHandle = window.setTimeout(go, BOOT_CAP_MS);
    onLoad = () => {
      listening = false;
      loaded = true;
      go();
    };
    if (loaded) onLoad();
    else {
      listening = true;
      window.addEventListener('load', onLoad, { once: true });
    }
  });

  return { promise, cancel };
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
  bootReady = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bootReadyRef = useRef(bootReady);
  bootReadyRef.current = bootReady;
  const wakeBootRef = useRef<(() => void) | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerCtorRef = useRef<MapLibreApi['Marker'] | null>(null);
  const markersRef = useRef<MlMarker[]>([]);
  const localityMarkersRef = useRef<MlMarker[]>([]);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const flyRef = useRef<() => void>(() => {});
  const selectRef = useRef(onSelectLocality);
  selectRef.current = onSelectLocality;
  const unmappedRef = useRef(onUnmappedWard);
  unmappedRef.current = onUnmappedWard;
  const selectedWardRef = useRef(selectedWardId);
  selectedWardRef.current = selectedWardId;
  const [mapEpoch, setMapEpoch] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let map: MlMap | null = null;
    let styleTimer = 0;
    let didBoot = false;
    const abort = new AbortController();
    const paint = afterFirstPaint(
      () => cancelled,
      () => bootReadyRef.current,
      (wake) => {
        wakeBootRef.current = wake;
      },
    );

    const boot = async () => {
      await paint.promise;
      if (cancelled || !containerRef.current || mapRef.current) return;

      let fellBack = false;
      let styleReady = false;
      let resolvedStyle: StyleSpecification | null = null;
      const fallBackStyle = () => {
        if (cancelled || fellBack || styleReady) return;
        // Style JSON already won the race against the chunk download.
        if (!map && resolvedStyle) return;
        fellBack = true;
        window.clearTimeout(styleTimer);
        abort.abort();
        map?.setStyle(OSM_FALLBACK_STYLE);
      };
      const armStyleTimeout = () => {
        window.clearTimeout(styleTimer);
        styleTimer = window.setTimeout(fallBackStyle, STYLE_TIMEOUT_MS);
      };
      armStyleTimeout();

      const styleTask = loadSlimPositron(abort.signal)
        .then((loaded) => {
          if (!cancelled && !fellBack) resolvedStyle = loaded;
          return loaded;
        })
        .catch(() => {
          if (!cancelled && !fellBack) {
            fellBack = true;
            window.clearTimeout(styleTimer);
          }
          return OSM_FALLBACK_STYLE;
        });

      const [ml, workerMod] = await Promise.all([
        import('maplibre-gl'),
        import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
        import('maplibre-gl/dist/maplibre-gl.css'),
        styleTask,
      ]);
      if (cancelled || !containerRef.current || mapRef.current) return;

      // The library asks for a sibling worker file Vite does not emit, so vector
      // tiles never draw and the canvas stays the positron paper colour.
      ml.setWorkerUrl(workerMod.default);
      ml.setMaxParallelImageRequests(MAX_PARALLEL_IMAGE_REQUESTS);

      let style: StyleSpecification = OSM_FALLBACK_STYLE;
      if (!fellBack && resolvedStyle) {
        style = resolvedStyle;
        armStyleTimeout();
      }

      map = new ml.Map({
        container: containerRef.current,
        style,
        center: [73.8567, 18.5204],
        zoom: DESKTOP_ZOOM,
        attributionControl: {
          compact: true,
          customAttribution: MAP_ATTRIBUTION,
        },
        maplibreLogo: true,
        maxTileCacheSize: MAX_TILE_CACHE_SIZE,
        fadeDuration: 0,
        refreshExpiredTiles: false,
      });
      map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
      mapRef.current = map;
      markerCtorRef.current = ml.Marker;
      (containerRef.current as MapCanvas).__hisabMap = map;

      let flight = 0;
      const flyToFocus = () => {
        const container = containerRef.current;
        const target = focusRef.current;
        if (!container || !target || !map) return;
        const token = ++flight;
        map.flyTo({
          center: [target.lng, target.lat],
          zoom: localityZoom(container),
          essential: true,
          padding: chromeCameraPadding(container),
        });
        map.once('moveend', () => {
          if (token !== flight || !containerRef.current || !map) return;
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
        if (!containerRef.current || !map || map.isMoving()) return;
        map.setPadding(chromeCameraPadding(containerRef.current));
      });

      let wardData: Awaited<ReturnType<typeof loadWardGeoJSON>> | null = null;
      let wardClicksBound = false;
      let wardChain = Promise.resolve();
      let attribCollapsed = false;

      const reattachMarkers = () => {
        if (!map) return;
        for (const marker of [...localityMarkersRef.current, ...markersRef.current]) {
          marker.addTo(map);
        }
      };

      const ensureWards = () => {
        if (!map) return;
        const live = map;
        wardChain = wardChain
          .then(async () => {
            wardData = wardData ?? (await loadWardGeoJSON());
            if (!styleReady || !live.getStyle()) return;
            if (!live.getSource('wards')) {
              live.addSource('wards', { type: 'geojson', data: wardData });
              live.addLayer({
                id: 'wards-fill',
                type: 'fill',
                source: 'wards',
                paint: {
                  'fill-color': '#0c1a17',
                  'fill-opacity': 0.06,
                },
              });
              live.addLayer({
                id: 'wards-line',
                type: 'line',
                source: 'wards',
                paint: {
                  'line-color': '#0c1a17',
                  'line-width': 1,
                  'line-opacity': 0.45,
                },
              });
              live.addLayer({
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
            if (live.getLayer('wards-selected')) {
              live.setFilter('wards-selected', ['==', ['get', 'wardId'], selectedWardRef.current ?? -1]);
            }
            if (wardClicksBound || !live.getLayer('wards-fill')) return;
            wardClicksBound = true;
            // Point-in-polygon on the click lng/lat. Layer queryRenderedFeatures is
            // empty while tiles/WebGL are still settling, which made polygon
            // clicks a silent no-op.
            live.on('click', (e: MapMouseEvent) => {
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
            live.on('mouseenter', 'wards-fill', () => {
              live.getCanvas().style.cursor = 'pointer';
            });
            live.on('mouseleave', 'wards-fill', () => {
              live.getCanvas().style.cursor = '';
            });
          })
          .catch(() => {
            // Markers still work if ward GeoJSON fails to load.
          });
      };

      // style.load fires for the remote style and again for the fallback JSON.
      // Map `load` fires only once, and never if the style URL fails.
      // A JSON style can finish inside the constructor, before this listener exists.
      const onStyle = () => {
        styleReady = true;
        window.clearTimeout(styleTimer);
        if (!attribCollapsed && map) {
          attribCollapsed = true;
          map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
        }
        flyToFocus();
        reattachMarkers();
        ensureWards();
      };
      map.on('style.load', onStyle);
      map.on('error', (event) => {
        if (styleReady || fellBack) return;
        const message = event.error instanceof Error ? event.error.message : String(event.error ?? '');
        if (/shader|webgl|program failed to link|could not compile/i.test(message)) return;
        fallBackStyle();
      });
      if (map.isStyleLoaded()) onStyle();

      didBoot = true;
      setMapEpoch((epoch) => epoch + 1);
    };

    void boot();

    return () => {
      cancelled = true;
      paint.cancel();
      abort.abort();
      window.clearTimeout(styleTimer);
      if (!map) return;
      markersRef.current.forEach((m) => m.remove());
      localityMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      markerCtorRef.current = null;
      if (didBoot) setMapEpoch((epoch) => epoch + 1);
    };
    // Map boot once; callbacks read latest via markers effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    wakeBootRef.current?.();
  }, [bootReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('wards-selected')) return;
    const wid = selectedWardId ?? -1;
    map.setFilter('wards-selected', ['==', ['get', 'wardId'], wid]);
  }, [selectedWardId, mapEpoch]);

  useEffect(() => {
    const map = mapRef.current;
    const Marker = markerCtorRef.current;
    localityMarkersRef.current.forEach((m) => m.remove());
    if (!map || !Marker) {
      localityMarkersRef.current = [];
      return;
    }

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
      return new Marker({ element: el, anchor: 'center' }).setLngLat([loc.lng, loc.lat]).addTo(map);
    });
  }, [localities, selectedId, onSelectLocality, mapEpoch]);

  useEffect(() => {
    const map = mapRef.current;
    const Marker = markerCtorRef.current;
    markersRef.current.forEach((m) => m.remove());
    if (!map || !Marker) {
      markersRef.current = [];
      return;
    }

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
        return new Marker({ element: el, anchor: 'center' }).setLngLat([report.lng, report.lat]).addTo(map);
      });
  }, [reports, onSelectLocality, onSelectReport, mapEpoch]);

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
