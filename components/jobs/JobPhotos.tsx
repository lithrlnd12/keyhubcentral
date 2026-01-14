'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { Job, JobPhoto } from '@/types/job';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { uploadJobPhoto, deleteJobPhoto } from '@/lib/firebase/storage';
import { addJobPhoto, removeJobPhoto } from '@/lib/firebase/jobs';
import { Camera, Image as ImageIcon, Upload, Trash2, X, ZoomIn } from 'lucide-react';

interface JobPhotosProps {
  job: Job;
  userId: string;
  userName: string;
  userRole?: string;
  onUpdate: () => void;
}

type PhotoCategory = 'before' | 'after';

export function JobPhotos({ job, userId, userName, userRole, onUpdate }: JobPhotosProps) {
  const [uploading, setUploading] = useState<PhotoCategory | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<JobPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const photos = job.photos || { before: [], after: [] };

  // Permission checks
  const isAdmin = userRole && ['owner', 'admin'].includes(userRole);
  const isSalesRep = job.salesRepId === userId;
  const isPM = job.pmId === userId || userRole === 'pm';

  // Sales reps can upload before photos, PMs can upload after photos
  const canUploadBefore = isAdmin || isSalesRep;
  const canUploadAfter = isAdmin || isPM;

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    category: PhotoCategory
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(category);

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select only image files');
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError('Image size must be less than 10MB');
          continue;
        }

        // Upload to storage
        const url = await uploadJobPhoto(job.id, file, category);

        // Add to job document
        const photo: JobPhoto = {
          url,
          uploadedBy: userId,
          uploadedByName: userName,
          uploadedAt: Timestamp.now(),
        };

        await addJobPhoto(job.id, category, photo);
      }

      onUpdate();
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(null);
      // Reset input
      if (category === 'before' && beforeInputRef.current) {
        beforeInputRef.current.value = '';
      } else if (category === 'after' && afterInputRef.current) {
        afterInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (category: PhotoCategory, photo: JobPhoto) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setDeleting(photo.url);
    try {
      // Delete from storage
      await deleteJobPhoto(photo.url);
      // Remove from job document
      await removeJobPhoto(job.id, category, photo.url);
      onUpdate();
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Failed to delete photo. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderPhotoGrid = (
    categoryPhotos: JobPhoto[],
    category: PhotoCategory,
    canUpload: boolean,
    canDelete: boolean
  ) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {categoryPhotos.map((photo, index) => (
        <div
          key={photo.url}
          className="relative group aspect-square rounded-lg overflow-hidden bg-gray-800 border border-gray-700"
        >
          <Image
            src={photo.url}
            alt={`${category} photo ${index + 1}`}
            fill
            className="object-cover cursor-pointer transition-transform group-hover:scale-105"
            onClick={() => setSelectedPhoto(photo)}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => setSelectedPhoto(photo)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            {canDelete && (
              <button
                onClick={() => handleDelete(category, photo)}
                disabled={deleting === photo.url}
                className="p-2 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {deleting === photo.url ? (
                  <Spinner size="sm" />
                ) : (
                  <Trash2 className="w-5 h-5 text-white" />
                )}
              </button>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-xs text-gray-300">
            {photo.uploadedByName}
          </div>
        </div>
      ))}

      {/* Upload button */}
      {canUpload && (
        <label
          className={`aspect-square rounded-lg border-2 border-dashed border-gray-600 hover:border-brand-gold flex flex-col items-center justify-center cursor-pointer transition-colors ${
            uploading === category ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <input
            ref={category === 'before' ? beforeInputRef : afterInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, category)}
            disabled={uploading === category}
          />
          {uploading === category ? (
            <Spinner size="md" />
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-500 mb-2" />
              <span className="text-sm text-gray-500">Add Photos</span>
            </>
          )}
        </label>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Before Photos (Sales Rep) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-brand-gold" />
            Before Photos
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Uploaded by Sales Rep)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.before.length === 0 && !canUploadBefore ? (
            <p className="text-gray-500 text-center py-8">No before photos uploaded yet</p>
          ) : (
            renderPhotoGrid(photos.before, 'before', canUploadBefore, isAdmin || isSalesRep)
          )}
        </CardContent>
      </Card>

      {/* After Photos (PM) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-brand-gold" />
            Completion Photos
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Uploaded by Project Manager)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.after.length === 0 && !canUploadAfter ? (
            <p className="text-gray-500 text-center py-8">No completion photos uploaded yet</p>
          ) : (
            renderPhotoGrid(photos.after, 'after', canUploadAfter, isAdmin || isPM)
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={selectedPhoto.url}
              alt="Photo preview"
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-center text-white">
            <p className="text-sm">
              Uploaded by {selectedPhoto.uploadedByName} on{' '}
              {formatDate(selectedPhoto.uploadedAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
