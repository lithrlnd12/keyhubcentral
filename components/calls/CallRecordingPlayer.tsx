'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

interface CallRecordingPlayerProps {
  recordingUrl: string;
  callId?: string;
  duration?: number;
}

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function CallRecordingPlayer({ recordingUrl, callId, duration }: CallRecordingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const handleLoadedMetadata = useCallback(() => {
    setIsLoading(false);
    if (audioRef.current) {
      setTotalDuration(audioRef.current.duration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [handleLoadedMetadata, handleTimeUpdate, handleEnded, handleError, handleCanPlay]);

  const togglePlay = () => {
    if (!audioRef.current || hasError) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || totalDuration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = clickX / rect.width;
    audioRef.current.currentTime = fraction * totalDuration;
    setCurrentTime(fraction * totalDuration);
  };

  const cyclePlaybackSpeed = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    const newSpeed = PLAYBACK_SPEEDS[nextIndex];
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  if (hasError) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-sm text-red-400">Recording unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg">
      <audio ref={audioRef} src={recordingUrl} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-brand-gold text-brand-black hover:bg-brand-gold-light transition-colors disabled:opacity-50"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <Spinner size="sm" className="text-brand-black" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Time display */}
      <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0 font-mono">
        {formatTime(currentTime)}
      </span>

      {/* Progress bar with gradient */}
      <div
        className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer relative overflow-hidden"
        onClick={handleProgressClick}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-gold to-brand-gold-light transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Duration */}
      <span className="text-xs text-gray-400 w-10 flex-shrink-0 font-mono">
        {formatTime(totalDuration)}
      </span>

      {/* Speed selector */}
      <button
        onClick={cyclePlaybackSpeed}
        className="flex-shrink-0 px-2 py-1 text-xs font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="Playback speed"
      >
        {playbackSpeed}x
      </button>
    </div>
  );
}
