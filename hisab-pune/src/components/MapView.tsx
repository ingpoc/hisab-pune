import { useEffect, useRef } from 'react';
import { Map, Marker, NavigationControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Locality, Report } from '../data/types';
import { localities as allLocalities } from '../data/localities';
import { electoralWards } from '../data/electoralWards';
import { loadWardGeoJSON } from '../lib/wardsGeo';
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
  open: '#e23d28',
  escalated: '#f0a202',
  resolved: '#2a9d6e',
};

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
  const selectRef = useRef(onSelectLocality);
  selectRef.current = onSelectLocality;
  const unmappedRef = useRef(onUnmappedWard);
  unmappedRef.current = onUnmappedWard;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [73.8567, 18.5204],
      zoom: 11.2,
      attributionControl: {},
    });

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

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
              'fill-color': '#f0a202',
              'fill-opacity': 0.22,
            },
          });
        }

        map.on('click', 'wards-fill', (e) => {
          const feature = e.features?.[0];
          const wid = feature?.properties?.wardId;
          if (typeof wid !== 'number' && typeof wid !== 'string') return;
          const wardId = Number(wid);
          if (!Number.isFinite(wardId)) return;
          const match = allLocalities.find((l) => l.electoralWardId === wardId);
          if (match) {
            selectRef.current(match.id);
            return;
          }
          unmappedRef.current?.({
            id: wardId,
            name: wardDisplayName(wardId, feature?.properties?.name),
          });
        });
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
        el.style.background = STATUS_COLOR[report.status];
        el.title = report.note;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectLocality(report.localityId);
          onSelectReport?.(report.id);
        });
        return new Marker({ element: el, anchor: 'bottom' })
          .setLngLat([report.lng, report.lat])
          .addTo(map);
      });
  }, [reports, onSelectLocality, onSelectReport]);

  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [focus.lng, focus.lat],
      zoom: 13.4,
      essential: true,
    });
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
