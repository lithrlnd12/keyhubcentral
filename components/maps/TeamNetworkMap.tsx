'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Search, X, Eye, EyeOff } from 'lucide-react';

export interface TeamMapEntry {
  id: string;
  name: string;
  role: 'installer' | 'service_tech' | 'sales_rep' | 'pm' | 'partner';
  roles?: string[];
  lat: number;
  lng: number;
  city: string;
  state: string;
  serviceRadius: number;
  detail: string;
}

interface TeamNetworkMapProps {
  entries: TeamMapEntry[];
  loading?: boolean;
  className?: string;
}

const ROLE_COLORS: Record<string, string> = {
  installer: '#3B82F6',
  service_tech: '#F97316',
  sales_rep: '#22C55E',
  pm: '#EAB308',
  partner: '#A855F7',
};

const ROLE_LABELS: Record<string, string> = {
  installer: 'Installer',
  service_tech: 'Service Tech',
  sales_rep: 'Sales Rep',
  pm: 'Project Manager',
  partner: 'Partner',
};

const MAX_SEARCH_RADIUS_MILES = 400;
const MILES_TO_METERS = 1609.34;

// Dynamic opacity based on zoom: faint when zoomed out, darker when zoomed in
function getCircleOpacity(zoom: number): { fill: number; stroke: number } {
  // Clamp zoom between 4 and 13 for interpolation
  const t = Math.min(1, Math.max(0, (zoom - 4) / 9));
  return {
    fill: 0.04 + t * 0.22,    // 0.04 at zoom 4 → 0.26 at zoom 13
    stroke: 0.18 + t * 0.52,  // 0.18 at zoom 4 → 0.70 at zoom 13
  };
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d4a84b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2d2d2d' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3d3d3d' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1626' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
];

export function TeamNetworkMap({
  entries,
  loading: externalLoading,
  className = '',
}: TeamNetworkMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const serviceCirclesRef = useRef<google.maps.Circle[]>([]);
  const zoomListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const searchCircleRef = useRef<google.maps.Circle | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showServiceAreas, setShowServiceAreas] = useState(true);

  // Role filter state — all visible by default
  const [visibleRoles, setVisibleRoles] = useState<Record<string, boolean>>({
    installer: true,
    service_tech: true,
    sales_rep: true,
    pm: true,
    partner: true,
  });

  // Zip search state
  const [zipInput, setZipInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ count: number; label: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const toggleRole = useCallback((role: string) => {
    setVisibleRoles((prev) => ({ ...prev, [role]: !prev[role] }));
  }, []);

  // Compute effective display role per entry based on active filters.
  // For multi-trade members the color shifts to whichever trade filter is on.
  function getEffectiveRole(entry: TeamMapEntry): string {
    const entryRoles = entry.roles && entry.roles.length > 0 ? entry.roles : [entry.role];
    const activeRoles = entryRoles.filter((r) => visibleRoles[r]);
    if (activeRoles.length === 0) return entry.role;
    // If the primary role is still active, keep it; otherwise pick the first active one
    if (activeRoles.includes(entry.role)) return entry.role;
    return activeRoles[0];
  }

  // Filter entries by visible roles — check all roles so multi-trade members stay visible
  const filteredEntries = entries.filter((e) => {
    const entryRoles = e.roles && e.roles.length > 0 ? e.roles : [e.role];
    return entryRoles.some((r) => visibleRoles[r]);
  });

  const handleZipSearch = useCallback(async () => {
    const zip = zipInput.trim();
    if (!/^\d{5}$/.test(zip)) {
      setSearchError('Enter a valid 5-digit zip code');
      return;
    }

    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ address: zip, region: 'us' });

      if (!result.results.length) {
        setSearchError('Zip code not found');
        return;
      }

      const location = result.results[0].geometry.location;
      const lat = location.lat();
      const lng = location.lng();

      const nearby = filteredEntries.filter(
        (e) => haversineDistance(lat, lng, e.lat, e.lng) <= e.serviceRadius,
      );

      if (searchCircleRef.current) searchCircleRef.current.setMap(null);
      searchCircleRef.current = new window.google.maps.Circle({
        map,
        center: { lat, lng },
        radius: MAX_SEARCH_RADIUS_MILES * 1609.34,
        fillColor: '#D4A84B',
        fillOpacity: 0.08,
        strokeColor: '#D4A84B',
        strokeOpacity: 0.5,
        strokeWeight: 1,
      });

      const nearbyIds = new Set(nearby.map((e) => e.id));
      markersRef.current.forEach((marker) => {
        const entryId = (marker as unknown as { _entryId: string })._entryId;
        const dot = marker.content as HTMLElement;
        if (nearbyIds.has(entryId)) {
          dot.style.opacity = '1';
          dot.style.transform = 'scale(1.15)';
        } else {
          dot.style.opacity = '0.25';
          dot.style.transform = 'scale(1)';
        }
      });

      map.fitBounds(searchCircleRef.current.getBounds()!);

      setSearchResult({
        count: nearby.length,
        label: nearby.length === 1
          ? '1 team member services this area'
          : `${nearby.length} team members service this area`,
      });
    } catch {
      setSearchError('Could not geocode zip code');
    } finally {
      setSearching(false);
    }
  }, [zipInput, filteredEntries]);

  const clearSearch = useCallback(() => {
    setZipInput('');
    setSearchResult(null);
    setSearchError(null);

    if (searchCircleRef.current) {
      searchCircleRef.current.setMap(null);
      searchCircleRef.current = null;
    }

    markersRef.current.forEach((marker) => {
      const dot = marker.content as HTMLElement;
      dot.style.opacity = '1';
      dot.style.transform = 'scale(1)';
    });

    const map = mapInstanceRef.current;
    if (map && filteredEntries.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      filteredEntries.forEach((e) => bounds.extend({ lat: e.lat, lng: e.lng }));
      map.fitBounds(bounds, 50);
    } else if (map) {
      map.setCenter({ lat: 39.8283, lng: -98.5795 });
      map.setZoom(4);
    }
  }, [filteredEntries]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 4,
      mapId: 'DEMO_MAP_ID',
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;
    infoWindowRef.current = new window.google.maps.InfoWindow();
    setMapLoading(false);
  }, []);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key not configured');
      setMapLoading(false);
      return;
    }

    if (window.google) {
      initializeMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    script.onerror = () => {
      setError('Failed to load Google Maps');
      setMapLoading(false);
    };

    document.head.appendChild(script);
  }, [initializeMap]);

  // Update markers + service area circles when filtered entries / filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;
    if (!map || !infoWindow) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    // Clear existing service circles
    serviceCirclesRef.current.forEach((c) => c.setMap(null));
    serviceCirclesRef.current = [];

    // Remove old zoom listener
    if (zoomListenerRef.current) {
      google.maps.event.removeListener(zoomListenerRef.current);
      zoomListenerRef.current = null;
    }

    if (filteredEntries.length === 0) return;

    const currentZoom = map.getZoom() || 4;
    const initialOpacity = getCircleOpacity(currentZoom);

    const bounds = new window.google.maps.LatLngBounds();

    filteredEntries.forEach((entry) => {
      const displayRole = getEffectiveRole(entry);
      const color = ROLE_COLORS[displayRole] || '#6B7280';

      // --- Service area circle for installers / service techs ---
      const entryRoles = entry.roles && entry.roles.length > 0 ? entry.roles : [entry.role];
      if (entry.serviceRadius > 0) {
        const circle = new window.google.maps.Circle({
          map: showServiceAreas ? map : null,
          center: { lat: entry.lat, lng: entry.lng },
          radius: entry.serviceRadius * MILES_TO_METERS,
          fillColor: color,
          fillOpacity: initialOpacity.fill,
          strokeColor: color,
          strokeOpacity: initialOpacity.stroke,
          strokeWeight: 1.5,
          clickable: false,
        });
        serviceCirclesRef.current.push(circle);
      }

      // --- Marker dot ---
      const container = document.createElement('div');
      container.style.cssText = `
        position: relative;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      `;

      const halo = document.createElement('div');
      halo.style.cssText = `
        position: absolute;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: ${color}4D;
        border: 1px solid ${color}66;
      `;

      const dot = document.createElement('div');
      dot.style.cssText = `
        position: relative;
        width: 14px;
        height: 14px;
        background: ${color};
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      `;

      container.appendChild(halo);
      container.appendChild(dot);

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: entry.lat, lng: entry.lng },
        map,
        content: container,
      });

      (marker as unknown as { _entryId: string })._entryId = entry.id;

      const location = [entry.city, entry.state].filter(Boolean).join(', ');
      const roleLabel = ROLE_LABELS[displayRole] || displayRole;
      const roleColor = ROLE_COLORS[displayRole] || '#6B7280';

      marker.addListener('click', () => {
        infoWindow.setContent(`
          <div style="color: #1a1a1a; font-family: system-ui, sans-serif; padding: 4px 0;">
            <div style="font-weight: 600; font-size: 14px;">${entry.name}</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${roleColor}; margin-right: 4px; vertical-align: middle;"></span>
              <span style="color: #555;">${roleLabel}</span>
            </div>
            ${location ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">${location}</div>` : ''}
            <div style="font-size: 12px; color: #888; margin-top: 4px;">${entry.detail}</div>
            ${entry.serviceRadius ? `<div style="font-size: 11px; color: #999; margin-top: 4px;">Service radius: ${entry.serviceRadius} mi</div>` : ''}
          </div>
        `);
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: entry.lat, lng: entry.lng });
    });

    // Zoom listener — dynamically adjust service circle opacity
    zoomListenerRef.current = map.addListener('zoom_changed', () => {
      const zoom = map.getZoom() || 4;
      const { fill, stroke } = getCircleOpacity(zoom);
      serviceCirclesRef.current.forEach((c) => {
        c.setOptions({ fillOpacity: fill, strokeOpacity: stroke });
      });
    });

    map.fitBounds(bounds, 50);

    const listener = map.addListener('idle', () => {
      if (map.getZoom()! > 12) map.setZoom(12);
      google.maps.event.removeListener(listener);
    });

    return () => {
      if (zoomListenerRef.current) {
        google.maps.event.removeListener(zoomListenerRef.current);
        zoomListenerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEntries, visibleRoles, showServiceAreas]);

  const isLoading = mapLoading || externalLoading;

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center ${className}`}>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Role Filter Toggles + Service Area Toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(ROLE_LABELS).map(([key, label]) => {
          const active = visibleRoles[key];
          const color = ROLE_COLORS[key];
          return (
            <button
              key={key}
              onClick={() => toggleRole(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-gray-700 text-gray-500'
              }`}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: active ? color : '#4B5563' }}
              />
              {label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px h-5 bg-gray-700 mx-1" />

        {/* Service Areas toggle */}
        <button
          onClick={() => setShowServiceAreas((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            showServiceAreas
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-transparent border-gray-700 text-gray-500'
          }`}
        >
          {showServiceAreas ? (
            <Eye className="w-3 h-3" />
          ) : (
            <EyeOff className="w-3 h-3" />
          )}
          Service Areas
        </button>
      </div>

      {/* Zip Code Search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="Search by zip code"
            value={zipInput}
            onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleZipSearch()}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/60"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        </div>
        <button
          onClick={handleZipSearch}
          disabled={searching || isLoading}
          className="px-4 py-2 bg-gold/20 text-gold border border-gold/30 rounded-lg text-sm font-medium hover:bg-gold/30 transition-colors disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
        {searchResult && (
          <button
            onClick={clearSearch}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {searchResult && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            searchResult.count > 0
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {searchResult.count > 0 ? searchResult.label : 'No team members in this area'}
          </span>
        )}
        {searchError && (
          <span className="text-sm text-red-400">{searchError}</span>
        )}
      </div>

      {/* Map */}
      <div className={`relative rounded-xl overflow-hidden ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
          </div>
        )}
        <div ref={mapRef} className="w-full h-full min-h-[300px]" />

        {/* Legend */}
        {!isLoading && (
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs space-y-1">
            {Object.entries(ROLE_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full border border-white/30"
                  style={{ background: color }}
                />
                <span className="text-gray-300">{ROLE_LABELS[key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
