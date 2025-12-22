'use client';

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: {
    address: string;
    lat: number;
    lng: number;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  }) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  label,
  placeholder = 'Enter an address...',
  error,
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const initAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'geometry'],
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (place.geometry?.location && place.address_components) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          // Parse address components
          let street = '';
          let city = '';
          let state = '';
          let zip = '';

          for (const component of place.address_components) {
            const type = component.types[0];
            if (type === 'street_number') {
              street = component.long_name + ' ';
            } else if (type === 'route') {
              street += component.long_name;
            } else if (type === 'locality') {
              city = component.long_name;
            } else if (type === 'administrative_area_level_1') {
              state = component.short_name;
            } else if (type === 'postal_code') {
              zip = component.long_name;
            }
          }

          onPlaceSelect({
            address: place.formatted_address || '',
            lat,
            lng,
            street: street.trim(),
            city,
            state,
            zip,
          });
        }
      });

      autocompleteRef.current = autocomplete;
      setIsLoaded(true);
    };

    // Check if Google Maps is already loaded
    if (window.google?.maps?.places) {
      initAutocomplete();
    } else {
      // Wait for script to load
      const checkGoogle = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkGoogle);
          initAutocomplete();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogle), 10000);
    }
  }, [onPlaceSelect]);

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-3 py-2 bg-brand-charcoal border rounded-lg text-white placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent',
            error ? 'border-red-500' : 'border-gray-700'
          )}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {!isLoaded && !error && (
        <p className="mt-1 text-xs text-gray-500">Loading address autocomplete...</p>
      )}
    </div>
  );
}
