'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, MapPin, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/hooks';
import { SPECIALTIES } from '@/types/contractor';
import { calculateDistanceMiles } from '@/lib/utils/distance';
import { geocodeAddress, buildAddressString } from '@/lib/utils/geocoding';

interface PublicContractor {
  id: string;
  businessName: string;
  lat: number;
  lng: number;
  serviceRadius: number;
  specialties: string[];
  rating: number;
  city: string;
  state: string;
}

const MILES_TO_METERS = 1609.34;

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d4a84b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d2d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d3d3d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
];

export default function CustomerFindPage() {
  const { user, getIdToken } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const homeMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const [contractors, setContractors] = useState<PublicContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Geocode customer address
  useEffect(() => {
    if (!user?.serviceAddress) return;
    const addr = buildAddressString(user.serviceAddress);
    if (!addr) return;
    geocodeAddress(addr).then((result) => {
      if (result) setCustomerCoords({ lat: result.lat, lng: result.lng });
    });
  }, [user?.serviceAddress]);

  const customerLat = customerCoords?.lat;
  const customerLng = customerCoords?.lng;

  // Fetch contractors
  useEffect(() => {
    async function fetchContractors() {
      try {
        const token = await getIdToken();
        if (!token) return;

        const res = await fetch('/api/contractors/public', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setContractors(data.contractors || []);
      } catch (err) {
        console.error('Error fetching contractors:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchContractors();
  }, [getIdToken]);

  // Filter contractors by specialty
  const filteredContractors = selectedSpecialties.length === 0
    ? contractors
    : contractors.filter((c) =>
        c.specialties.some((s) => selectedSpecialties.includes(s))
      );

  // Calculate distances
  const contractorsWithDistance = filteredContractors.map((c) => ({
    ...c,
    distance: customerLat && customerLng
      ? calculateDistanceMiles(customerLat, customerLng, c.lat, c.lng)
      : null,
  }));

  const nearbyCount = contractorsWithDistance.filter(
    (c) => c.distance !== null && c.distance <= c.serviceRadius
  ).length;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      try {
        const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
        await google.maps.importLibrary('marker');

        const center = customerLat && customerLng
          ? { lat: customerLat, lng: customerLng }
          : { lat: 32.7767, lng: -96.7970 }; // Dallas default

        const map = new Map(mapRef.current!, {
          center,
          zoom: 10,
          styles: MAP_STYLES,
          mapId: 'find-pros-map',
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = new google.maps.InfoWindow();
        setMapLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        setMapLoading(false);
      }
    };

    // Wait for Google Maps API
    if (typeof google !== 'undefined' && google.maps) {
      initMap();
    } else {
      const checkInterval = setInterval(() => {
        if (typeof google !== 'undefined' && google.maps) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 200);
      return () => clearInterval(checkInterval);
    }
  }, [customerLat, customerLng]);

  // Update markers when filtered data changes
  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];
    if (homeMarkerRef.current) {
      homeMarkerRef.current.map = null;
      homeMarkerRef.current = null;
    }

    // Add home marker
    if (customerLat && customerLng) {
      const homePin = document.createElement('div');
      homePin.innerHTML = `<div style="width:16px;height:16px;background:#d4a84b;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`;

      const homeMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: customerLat, lng: customerLng },
        content: homePin,
        title: 'Your Home',
        zIndex: 1000,
      });
      homeMarkerRef.current = homeMarker;
    }

    // Add contractor markers
    contractorsWithDistance.forEach((contractor) => {
      const isNearby = contractor.distance !== null && contractor.distance <= contractor.serviceRadius;
      const pinColor = isNearby ? '#22C55E' : '#6B7280';

      const pinEl = document.createElement('div');
      pinEl.innerHTML = `<div style="width:12px;height:12px;background:${pinColor};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer;"></div>`;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: contractor.lat, lng: contractor.lng },
        content: pinEl,
        title: contractor.businessName,
      });

      // Service radius circle
      const circle = new google.maps.Circle({
        map,
        center: { lat: contractor.lat, lng: contractor.lng },
        radius: contractor.serviceRadius * MILES_TO_METERS,
        fillColor: pinColor,
        fillOpacity: 0.06,
        strokeColor: pinColor,
        strokeOpacity: 0.25,
        strokeWeight: 1,
        clickable: false,
      });

      // Info window
      marker.addListener('click', () => {
        const distanceText = contractor.distance !== null
          ? `${contractor.distance.toFixed(1)} mi away`
          : '';
        const stars = contractor.rating > 0
          ? '★'.repeat(Math.round(contractor.rating)) + ` ${contractor.rating.toFixed(1)}`
          : 'New';
        const specialtiesHtml = contractor.specialties.length > 0
          ? contractor.specialties.map((s) =>
              `<span style="display:inline-block;padding:2px 8px;background:rgba(212,168,75,0.15);color:#d4a84b;border-radius:4px;font-size:11px;margin:2px;">${s}</span>`
            ).join('')
          : '';

        infoWindowRef.current?.setContent(`
          <div style="padding:8px;min-width:200px;color:#fff;background:#1a1a1a;border-radius:8px;">
            <p style="font-weight:600;font-size:14px;margin:0 0 4px;">${contractor.businessName}</p>
            <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">${contractor.city}, ${contractor.state} · ${distanceText}</p>
            <p style="color:#eab308;font-size:12px;margin:0 0 8px;">${stars}</p>
            <div style="margin-bottom:8px;">${specialtiesHtml}</div>
            <a href="/customer/book" style="display:inline-block;padding:6px 14px;background:#d4a84b;color:#0a0a0a;font-size:12px;font-weight:600;border-radius:6px;text-decoration:none;">Book This Pro</a>
          </div>
        `);
        infoWindowRef.current?.open(map, marker);
      });

      markersRef.current.push(marker);
      circlesRef.current.push(circle);
    });
  }, [contractorsWithDistance, customerLat, customerLng]);

  useEffect(() => {
    if (!mapLoading) updateMarkers();
  }, [mapLoading, updateMarkers]);

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Find Pros Near You</h1>
          <p className="text-gray-400 mt-1">Browse vetted contractors in your area</p>
        </div>
        {!loading && (
          <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <span className="text-green-400 text-sm font-medium">{nearbyCount} pro{nearbyCount !== 1 ? 's' : ''} near you</span>
          </div>
        )}
      </div>

      {/* Specialty Filters */}
      <div className="flex flex-wrap gap-2">
        {SPECIALTIES.map((specialty) => (
          <button
            key={specialty}
            onClick={() => toggleSpecialty(specialty)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedSpecialties.includes(specialty)
                ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40'
                : 'bg-brand-charcoal border border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {specialty}
          </button>
        ))}
        {selectedSpecialties.length > 0 && (
          <button
            onClick={() => setSelectedSpecialties([])}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <div className="relative">
          {(loading || mapLoading) && (
            <div className="absolute inset-0 bg-brand-black/80 flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
            </div>
          )}
          <div ref={mapRef} className="h-[500px] w-full" />
        </div>
      </Card>

      {/* Contractor List */}
      {!loading && contractorsWithDistance.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Nearby Pros</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {contractorsWithDistance
              .filter((c) => c.distance !== null)
              .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
              .slice(0, 8)
              .map((contractor) => (
                <Card key={contractor.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white font-medium">{contractor.businessName}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {contractor.city}, {contractor.state}
                        {contractor.distance !== null && ` · ${contractor.distance.toFixed(1)} mi`}
                      </p>
                    </div>
                    {contractor.rating > 0 && (
                      <div className="flex items-center gap-1 text-yellow-400 text-sm">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {contractor.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                  {contractor.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {contractor.specialties.slice(0, 4).map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-brand-gold/10 text-brand-gold text-[10px] rounded">
                          {s}
                        </span>
                      ))}
                      {contractor.specialties.length > 4 && (
                        <span className="text-gray-500 text-[10px]">+{contractor.specialties.length - 4}</span>
                      )}
                    </div>
                  )}
                  <Link
                    href="/customer/book"
                    className="block mt-3 text-center text-xs font-semibold text-brand-gold border border-brand-gold/30 rounded-lg py-2 hover:bg-brand-gold/10 transition-colors"
                  >
                    Book This Pro
                  </Link>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
