'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface TerritoryMapProps {
  center: { lat: number; lng: number } | null;
  radius: number; // in miles
  onCenterChange?: (center: { lat: number; lng: number }) => void;
  className?: string;
  interactive?: boolean;
}

// Types declared in types/google-maps.d.ts

const MILES_TO_METERS = 1609.34;

export function TerritoryMap({
  center,
  radius,
  onCenterChange,
  className = '',
  interactive = true,
}: TerritoryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;

    const defaultCenter = center || { lat: 39.8283, lng: -98.5795 }; // Center of US

    // Create map - using DEMO_MAP_ID for AdvancedMarkerElement
    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: center ? 10 : 4,
      mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
      styles: [
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
      ],
      disableDefaultUI: !interactive,
      zoomControl: interactive,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    mapInstanceRef.current = map;

    // If no center, allow clicking to set initial position
    if (!center && interactive && onCenterChange) {
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          onCenterChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      });
    }

    // Create marker if we have a center
    if (center) {
      // Create custom marker element
      const markerContent = document.createElement('div');
      markerContent.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: #D4A84B;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: ${interactive ? 'grab' : 'default'};
        "></div>
      `;

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: center,
        map,
        gmpDraggable: interactive,
        content: markerContent,
      });

      markerRef.current = marker;

      // Create radius circle
      const circle = new window.google.maps.Circle({
        map,
        center,
        radius: radius * MILES_TO_METERS,
        fillColor: '#D4A84B',
        fillOpacity: 0.15,
        strokeColor: '#D4A84B',
        strokeOpacity: 0.8,
        strokeWeight: 2,
      });

      circleRef.current = circle;

      // Handle marker drag
      if (interactive && onCenterChange) {
        marker.addListener('dragend', () => {
          const position = marker.position;
          if (position) {
            const newCenter = {
              lat: typeof position.lat === 'function' ? position.lat() : position.lat,
              lng: typeof position.lng === 'function' ? position.lng() : position.lng
            };
            onCenterChange(newCenter);
            circle.setCenter(newCenter);
          }
        });
      }

      // Fit bounds to circle
      map.fitBounds(circle.getBounds()!);
    }

    setLoading(false);
  }, [center, radius, interactive, onCenterChange]);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key not configured');
      setLoading(false);
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
      setLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [initializeMap]);

  // Update circle radius when it changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * MILES_TO_METERS);
      if (mapInstanceRef.current && circleRef.current.getBounds()) {
        mapInstanceRef.current.fitBounds(circleRef.current.getBounds()!);
      }
    }
  }, [radius]);

  // Update marker and circle position when center changes
  useEffect(() => {
    if (!center || !mapInstanceRef.current) return;

    // If marker/circle already exist, just update position
    if (markerRef.current && circleRef.current) {
      markerRef.current.position = center;
      circleRef.current.setCenter(center);
      mapInstanceRef.current.panTo(center);
      return;
    }

    // Create marker and circle for the first time (click-to-set flow)
    const map = mapInstanceRef.current;

    const markerContent = document.createElement('div');
    markerContent.innerHTML = `
      <div style="
        width: 24px;
        height: 24px;
        background: #D4A84B;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: ${interactive ? 'grab' : 'default'};
      "></div>
    `;

    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      position: center,
      map,
      gmpDraggable: interactive,
      content: markerContent,
    });
    markerRef.current = marker;

    const circle = new window.google.maps.Circle({
      map,
      center,
      radius: radius * MILES_TO_METERS,
      fillColor: '#D4A84B',
      fillOpacity: 0.15,
      strokeColor: '#D4A84B',
      strokeOpacity: 0.8,
      strokeWeight: 2,
    });
    circleRef.current = circle;

    if (interactive && onCenterChange) {
      marker.addListener('dragend', () => {
        const position = marker.position;
        if (position) {
          const newCenter = {
            lat: typeof position.lat === 'function' ? position.lat() : position.lat,
            lng: typeof position.lng === 'function' ? position.lng() : position.lng
          };
          onCenterChange(newCenter);
          circle.setCenter(newCenter);
        }
      });
    }

    map.fitBounds(circle.getBounds()!);
  }, [center, interactive, onCenterChange, radius]);

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center ${className}`}>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full min-h-[300px]" />
    </div>
  );
}
