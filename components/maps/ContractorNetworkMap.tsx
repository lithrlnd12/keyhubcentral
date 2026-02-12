'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Search, X } from 'lucide-react';

interface ContractorMapEntry {
  id: string;
  businessName: string | null;
  trades: string[];
  lat: number;
  lng: number;
  city: string;
  state: string;
  serviceRadius: number;
}

interface ContractorNetworkMapProps {
  contractors: ContractorMapEntry[];
  loading?: boolean;
  className?: string;
}

const TRADE_COLORS: Record<string, string> = {
  installer: '#3B82F6',
  sales_rep: '#22C55E',
  service_tech: '#F97316',
  pm: '#A855F7',
};

const TRADE_LABELS: Record<string, string> = {
  installer: 'Installer',
  sales_rep: 'Sales Rep',
  service_tech: 'Service Tech',
  pm: 'Project Manager',
};

const DEFAULT_COLOR = '#6B7280';
const MAX_SEARCH_RADIUS_MILES = 400;

function getTradeColor(trades: string[]): string {
  for (const trade of trades) {
    const key = trade.toLowerCase().replace(/\s+/g, '_');
    if (TRADE_COLORS[key]) return TRADE_COLORS[key];
  }
  return DEFAULT_COLOR;
}

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
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

export function ContractorNetworkMap({
  contractors,
  loading: externalLoading,
  className = '',
}: ContractorNetworkMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const searchCircleRef = useRef<google.maps.Circle | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zip search state
  const [zipInput, setZipInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ count: number; label: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

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

      // Count contractors whose service radius covers this zip
      const nearby = contractors.filter(
        (c) => haversineDistance(lat, lng, c.lat, c.lng) <= c.serviceRadius,
      );

      // Draw a visual search circle using the max radius for context
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

      // Dim out-of-range markers, highlight in-range
      const nearbyIds = new Set(nearby.map((c) => c.id));
      markersRef.current.forEach((marker, i) => {
        const c = contractors[i];
        if (!c) return;
        const dot = marker.content as HTMLElement;
        if (nearbyIds.has(c.id)) {
          dot.style.opacity = '1';
          dot.style.width = '16px';
          dot.style.height = '16px';
        } else {
          dot.style.opacity = '0.25';
          dot.style.width = '14px';
          dot.style.height = '14px';
        }
      });

      // Zoom to circle bounds
      map.fitBounds(searchCircleRef.current.getBounds()!);

      setSearchResult({
        count: nearby.length,
        label: nearby.length === 1
          ? '1 contractor services this area'
          : `${nearby.length} contractors service this area`,
      });
    } catch {
      setSearchError('Could not geocode zip code');
    } finally {
      setSearching(false);
    }
  }, [zipInput, contractors]);

  const clearSearch = useCallback(() => {
    setZipInput('');
    setSearchResult(null);
    setSearchError(null);

    // Remove radius circle
    if (searchCircleRef.current) {
      searchCircleRef.current.setMap(null);
      searchCircleRef.current = null;
    }

    // Reset all markers to full opacity / original size
    markersRef.current.forEach((marker) => {
      const dot = marker.content as HTMLElement;
      dot.style.opacity = '1';
      dot.style.width = '14px';
      dot.style.height = '14px';
    });

    // Zoom back to fit all markers
    const map = mapInstanceRef.current;
    if (map && contractors.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      contractors.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lng }));
      map.fitBounds(bounds, 50);
    } else if (map) {
      map.setCenter({ lat: 39.8283, lng: -98.5795 });
      map.setZoom(4);
    }
  }, [contractors]);

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

  // Update markers when contractors change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;
    if (!map || !infoWindow) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    if (contractors.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    contractors.forEach((c) => {
      const color = getTradeColor(c.trades);

      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 14px;
        height: 14px;
        background: ${color};
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        cursor: pointer;
      `;

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: c.lat, lng: c.lng },
        map,
        content: dot,
      });

      const tradesDisplay = c.trades
        .map((t) => {
          const key = t.toLowerCase().replace(/\s+/g, '_');
          return TRADE_LABELS[key] || t;
        })
        .join(', ');

      const location = [c.city, c.state].filter(Boolean).join(', ');

      marker.addListener('click', () => {
        infoWindow.setContent(`
          <div style="color: #1a1a1a; font-family: system-ui, sans-serif; padding: 4px 0;">
            <div style="font-weight: 600; font-size: 14px;">${c.businessName || 'Unnamed'}</div>
            ${location ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">${location}</div>` : ''}
            <div style="font-size: 12px; color: #888; margin-top: 4px;">${tradesDisplay || 'No trades listed'}</div>
            <div style="font-size: 11px; color: #999; margin-top: 4px;">Service radius: ${c.serviceRadius} mi</div>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
      bounds.extend({ lat: c.lat, lng: c.lng });
    });

    map.fitBounds(bounds, 50);

    // Don't zoom in too far for a single marker
    const listener = map.addListener('idle', () => {
      if (map.getZoom()! > 12) map.setZoom(12);
      google.maps.event.removeListener(listener);
    });
  }, [contractors]);

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
            {searchResult.count > 0 ? searchResult.label : 'No contractors in this area'}
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
            {Object.entries(TRADE_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full border border-white/30"
                  style={{ background: color }}
                />
                <span className="text-gray-300">{TRADE_LABELS[key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
