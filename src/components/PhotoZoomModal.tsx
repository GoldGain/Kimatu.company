import { useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

interface PhotoZoomModalProps {
  photoUrl: string;
  altText?: string;
  onClose: () => void;
}

export default function PhotoZoomModal({ photoUrl, altText = 'Photo', onClose }: PhotoZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const zoomIn = useCallback(() => setScale(s => Math.min(s + 0.25, 4)), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(s - 0.25, 0.5)), []);
  const resetZoom = useCallback(() => setScale(1), []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex flex-col items-center max-w-2xl w-full">
        {/* Controls bar */}
        <div className="flex items-center gap-2 mb-4 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-2 text-white hover:bg-white/20 rounded-xl disabled:opacity-40 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={resetZoom}
            className="px-3 py-1 text-white text-sm font-medium hover:bg-white/20 rounded-xl transition-colors min-w-[60px] text-center"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= 4}
            className="p-2 text-white hover:bg-white/20 rounded-xl disabled:opacity-40 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/30 mx-1" />
          <button
            onClick={toggleFullscreen}
            className="p-2 text-white hover:bg-white/20 rounded-xl transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <div className="w-px h-6 bg-white/30 mx-1" />
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-red-500/70 rounded-xl transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photo */}
        <div className="overflow-auto max-h-[75vh] max-w-full rounded-2xl flex items-center justify-center">
          <img
            src={photoUrl}
            alt={altText}
            style={{ transform: `scale(${scale})`, transformOrigin: 'center', transition: 'transform 0.2s ease' }}
            className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl cursor-zoom-in select-none"
            draggable={false}
            onClick={zoomIn}
          />
        </div>

        <p className="mt-3 text-white/60 text-xs">Click photo to zoom in • Click outside to close</p>
      </div>
    </div>
  );
}
