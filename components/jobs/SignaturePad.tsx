'use client';

import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/Button';
import { Eraser, Check, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  initialSignature?: string;
  disabled?: boolean;
}

export function SignaturePad({
  label,
  onSave,
  onClear,
  initialSignature,
  disabled = false,
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDataUrl, setSavedDataUrl] = useState<string | null>(initialSignature || null);

  useEffect(() => {
    if (initialSignature && sigCanvas.current) {
      // Load initial signature if provided
      sigCanvas.current.fromDataURL(initialSignature);
      setIsEmpty(false);
      setIsSaved(true);
      setSavedDataUrl(initialSignature);
    }
  }, [initialSignature]);

  const handleBegin = () => {
    if (isSaved) {
      // If already saved, reset to allow re-signing
      setIsSaved(false);
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current) {
      setIsEmpty(sigCanvas.current.isEmpty());
    }
  };

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
      setIsSaved(false);
      setSavedDataUrl(null);
      onClear?.();
    }
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      try {
        // Try getTrimmedCanvas first, fall back to getCanvas if it fails
        let canvas;
        try {
          canvas = sigCanvas.current.getTrimmedCanvas();
        } catch {
          // Fallback: get the raw canvas
          canvas = sigCanvas.current.getCanvas();
        }
        const dataUrl = canvas.toDataURL('image/png');
        setSavedDataUrl(dataUrl);
        setIsSaved(true);
        onSave(dataUrl);
      } catch (error) {
        console.error('Error saving signature:', error);
        // Last resort fallback - get data URL directly
        const dataUrl = sigCanvas.current.toDataURL('image/png');
        setSavedDataUrl(dataUrl);
        setIsSaved(true);
        onSave(dataUrl);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-400 font-medium">{label}</label>
        {isSaved && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <Check className="w-3 h-3" />
            Saved
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        className={`relative border rounded-lg overflow-hidden ${
          disabled
            ? 'bg-gray-900 border-gray-700 opacity-60'
            : isSaved
            ? 'bg-gray-900 border-green-500/50'
            : 'bg-white border-gray-600'
        }`}
      >
        {/* Display saved signature as image if saved */}
        {isSaved && savedDataUrl ? (
          <div className="relative">
            <img
              src={savedDataUrl}
              alt={`${label} signature`}
              className="w-full h-[150px] object-contain bg-white"
            />
            {!disabled && (
              <div className="absolute bottom-2 right-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClear}
                  className="bg-gray-800/80"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Re-sign
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                className: 'w-full h-[150px]',
                style: {
                  width: '100%',
                  height: '150px',
                  touchAction: 'none',
                },
              }}
              onBegin={handleBegin}
              onEnd={handleEnd}
              clearOnResize={false}
            />
            {/* Placeholder text */}
            {isEmpty && !disabled && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 text-sm">Sign here</p>
              </div>
            )}
            {/* Action buttons */}
            {!disabled && (
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClear}
                  disabled={isEmpty}
                  className="bg-gray-800/80 text-white hover:bg-gray-700"
                >
                  <Eraser className="w-3 h-3 mr-1" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isEmpty}
                  className="bg-green-500/80 text-white hover:bg-green-600"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <p className="text-xs text-gray-500">
        {disabled
          ? 'Signature captured'
          : isSaved
          ? 'Click "Re-sign" to sign again'
          : 'Use your finger or mouse to sign above'}
      </p>
    </div>
  );
}
