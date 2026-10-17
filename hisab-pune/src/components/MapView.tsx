import { useEffect, useRef } from 'react';
import { Map, Marker, NavigationControl, type MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
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
const LOCALITY_ZOOM = 13.4;
const MARKER_PX = 46;

function controlRect(el: Element | null): DOMRect | null {
  if (!el) return null;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden') return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  return rect;
}

/**
 * Keep the selected locality in the map area that is not under chrome.
 * Bottom clearance is the sheet handle plus one marker. Top and side
 * clearance is the control's intrusion plus one marker.
 */
function chromeCameraPadding(container: HTMLElement) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (width < 80 || height < 80) return { top: 0, right: 0, bottom: 0, left: 0 };

  const canvas = container.getBoundingClientRect();
  const zoom = controlRect(container.querySelector('.maplibregl-ctrl-top-right'));
  const attrib = controlRect(container.querySelector('.maplibregl-ctrl-bottom-right'));
  const logo = controlRect(container.querySelector('.maplibregl-ctrl-bottom-left'));
  const handle = controlRect(document.querySelector('.map-page__sheet-handle'));

  const intoTop = (rect: DOMRect | null) => (rect ? Math.max(0, rect.bottom - canvas.top) : 0);
  const intoRight = (rect: DOMRect | null) => (rect ? Math.max(0, canvas.right - rect.left) : 0);
  const intoBottom = (rect: DOMRect | null) => (rect ? Math.max(0, canvas.bottom - rect.top) : 0);
  const intoLeft = (rect: DOMRect | null) => (rect ? Math.max(0, rect.right - canvas.left) : 0);

  let top = (zoom ? intoTop(zoom) : 0) + (zoom ? MARKER_PX : 0);
  let right = Math.max(intoRight(zoom), intoRight(attrib));
  if (right > 0) right += MARKER_PX;
  let left = intoLeft(logo);
  if (left > 0) left += MARKER_PX;
  const handlePad = handle ? handle.height + MARKER_PX : 0;
  let bottom = Math.max(intoBottom(attrib) + (attrib ? MARKER_PX : 0), intoBottom(logo) + (logo ? MARKER_PX : 0), handlePad);

  const minFree = 80;
  // Wide maps have spare width. Shift the usable centre right so a neighbour
  // that would sit on the zoom or attribution corner clears those controls.
  const spareX = width - minFree - (left + right);
  if (spareX > 0) left += Math.min(60, spareX);
  if (top + bottom > height - minFree) {
    const scale = (height - minFree) / Math.max(1, top + bottom);
    top *= scale;
    bottom *= scale;
  }
  if (left + right > width - minFree) {
    const scale = (width - minFree) / Math.max(1, left + right);
    left *= scale;
    right *= scale;
  }

  return {
    top: Math.round(top),
    right: Math.round(right),
    bottom: Math.round(bottom),
    left: Math.round(left),
  };
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
    // Narrow maps open the attribution bar immediately. Leave the 46px info button.
    const collapseAttrib = () => {
      map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    };
    collapseAttrib();
    map.on('styledata', collapseAttrib);

    let flight = 0;
    const flyToFocus = () => {
      const container = containerRef.current;
      const target = focusRef.current;
      if (!container || !target) return;
      const token = ++flight;
      map.flyTo({
        center: [target.lng, target.lat],
        zoom: LOCALITY_ZOOM,
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
    map.on('load', () => {
      collapseAttrib();
      flyToFocus();
    });
    flyToFocus();

    map.on('load', async () => {
      try {
        const fc = await loadWardGeoJSON();
        if (!map.getSource('wards')) {
          map.addSource('wards', { type: 'geojson', data: fc });
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

        const onWardClick = (e: MapMouseEvent) => {
          const wardId = wardIdAt(e.lngLat.lng, e.lngLat.lat, fc);
          if (wardId == null) return;
          const match = allLocalities.find((l) => l.electoralWardId === wardId);
          if (match) {
            selectRef.current(match.id);
            return;
          }
          const geoName = fc.features.find((f) => f.properties.wardId === wardId)?.properties.name;
          unmappedRef.current?.({
            id: wardId,
            name: wardDisplayName(wardId, geoName),
          });
        };
        // Point-in-polygon on the click lng/lat. Layer queryRenderedFeatures is
        // empty while OSM tiles/WebGL are still settling, which made polygon
        // clicks a silent no-op.
        map.on('click', onWardClick);
        map.on('mouseenter', 'wards-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'wards-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      } catch {
        // Map still works with markers if GeoJSON fails to load
      }
    });

    return () => {
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
