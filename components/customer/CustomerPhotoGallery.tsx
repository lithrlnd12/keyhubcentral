'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobPhoto } from '@/types/job';

interface CustomerPhotoGalleryProps {
  photos: JobPhoto[];
  beforePhotos?: JobPhoto[];
  afterPhotos?: JobPhoto[];
  className?: string;
}

export function CustomerPhotoGallery({
  photos,
  beforePhotos,
  afterPhotos,
  className,
}: CustomerPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Build a flat list of all photos with type labels
  const allPhotos: (JobPhoto & { label?: string })[] = [];

  if (beforePhotos && beforePhotos.length > 0) {
    beforePhotos.forEach((p) => allPhotos.push({ ...p, label: 'Before' }));
  }
  if (afterPhotos && afterPhotos.length > 0) {
    afterPhotos.forEach((p) => allPhotos.push({ ...p, label: 'After' }));
  }
  if (photos && photos.length > 0 && !beforePhotos && !afterPhotos) {
    photos.forEach((p) => allPhotos.push(p));
  }

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + allPhotos.length) % allPhotos.length : null
    );
  }, [allPhotos.length]);

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % allPhotos.length : null
    );
  }, [allPhotos.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    }

    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, closeLightbox, goToPrev, goToNext]);

  if (allPhotos.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-8 text-center',
          className
        )}
      >
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <ImageOff className="w-7 h-7 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No photos available yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Photos will appear here as your project progresses
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {allPhotos.map((photo, index) => (
          <button
            key={`${photo.url}-${index}`}
            onClick={() => openLightbox(index)}
            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <img
              src={photo.url}
              alt={photo.caption || `Photo ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

            {/* Before/After label */}
            {photo.label && (
              <span
                className={cn(
                  'absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium',
                  photo.label === 'Before'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                )}
              >
                {photo.label}
              </span>
            )}

            {/* Camera icon on hover */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white drop-shadow-md" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && allPhotos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous button */}
          {allPhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-4 z-10 p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          <div
            className="max-w-4xl max-h-[85vh] mx-12"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={allPhotos[lightboxIndex].url}
              alt={
                allPhotos[lightboxIndex].caption ||
                `Photo ${lightboxIndex + 1}`
              }
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            {/* Caption and label */}
            <div className="mt-3 text-center">
              {allPhotos[lightboxIndex].label && (
                <span
                  className={cn(
                    'inline-block px-3 py-1 rounded-full text-xs font-medium mb-2',
                    allPhotos[lightboxIndex].label === 'Before'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-green-100 text-green-700'
                  )}
                >
                  {allPhotos[lightboxIndex].label}
                </span>
              )}
              {allPhotos[lightboxIndex].caption && (
                <p className="text-white/80 text-sm">
                  {allPhotos[lightboxIndex].caption}
                </p>
              )}
              <p className="text-white/50 text-xs mt-1">
                {lightboxIndex + 1} of {allPhotos.length}
              </p>
            </div>
          </div>

          {/* Next button */}
          {allPhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 z-10 p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Next photo"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
