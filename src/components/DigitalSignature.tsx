import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Pen, X, Save, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DigitalSignatureProps {
  title: string;
  subtitle?: string;
  existingSignatureUrl?: string | null;
  existingSignatureType?: string | null;
  onSave: (signatureUrl: string, signatureType: 'drawn' | 'uploaded') => Promise<void>;
  onClear?: () => Promise<void>;
}

export default function DigitalSignature({
  title,
  subtitle,
  existingSignatureUrl,
  existingSignatureType,
  onSave,
  onClear,
}: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset canvas when showing
  useEffect(() => {
    if (showCanvas) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    }
  }, [showCanvas]);

  const getCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [getCoordinates]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getCoordinates]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.closePath();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  const saveDrawnSignature = async () => {
    if (!hasDrawn) {
      toast.error('Please draw a signature first');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      // Convert canvas to data URL (PNG)
      const dataUrl = canvas.toDataURL('image/png');
      await onSave(dataUrl, 'drawn');
      setShowCanvas(false);
      toast.success(`${title} saved successfully!`);
    } catch (err: any) {
      toast.error('Failed to save signature: ' + err.message);
    }
    setSaving(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG or JPG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveUploadedSignature = async () => {
    if (!uploadPreview) {
      toast.error('Please select an image first');
      return;
    }
    setSaving(true);
    try {
      await onSave(uploadPreview, 'uploaded');
      setShowUpload(false);
      setUploadPreview(null);
      toast.success(`${title} uploaded successfully!`);
    } catch (err: any) {
      toast.error('Failed to upload signature: ' + err.message);
    }
    setSaving(false);
  };

  const handleClear = async () => {
    if (!onClear) return;
    setSaving(true);
    try {
      await onClear();
      toast.success(`${title} cleared`);
    } catch (err: any) {
      toast.error('Failed to clear: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-[#111111] text-sm">{title}</h4>
          {subtitle && <p className="text-xs text-[#666666]">{subtitle}</p>}
        </div>
        {existingSignatureUrl && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
      </div>

      {/* Show existing signature preview */}
      {existingSignatureUrl && !showCanvas && !showUpload && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-2">Current Signature ({existingSignatureType === 'drawn' ? 'Drawn' : 'Uploaded'}):</p>
          <img
            src={existingSignatureUrl}
            alt={`${title} Preview`}
            className="max-h-20 object-contain bg-white border border-gray-200 rounded-lg p-2"
            style={{ maxWidth: '100%' }}
          />
        </div>
      )}

      {/* Action buttons */}
      {!showCanvas && !showUpload && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowCanvas(true); setShowUpload(false); clearCanvas(); }}
            className="flex items-center gap-1.5 bg-[#2563EB] text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-[#1d4ed8] transition-colors"
          >
            <Pen className="w-3.5 h-3.5" />
            {existingSignatureUrl ? 'Redraw' : 'Draw Signature'}
          </button>
          <button
            onClick={() => { setShowUpload(true); setShowCanvas(false); }}
            className="flex items-center gap-1.5 border border-[#2563EB] text-[#2563EB] px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {existingSignatureUrl ? 'Re-upload' : 'Upload Image'}
          </button>
          {existingSignatureUrl && onClear && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="flex items-center gap-1.5 border border-red-300 text-red-500 px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              {saving ? 'Clearing...' : 'Remove'}
            </button>
          )}
        </div>
      )}

      {/* Draw Signature Canvas */}
      {showCanvas && (
        <div className="space-y-3">
          <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="w-full cursor-crosshair"
              style={{ touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 text-sm">Draw your signature here</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveDrawnSignature}
              disabled={!hasDrawn || saving}
              className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save Signature'}
            </button>
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              onClick={() => setShowCanvas(false)}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload Signature */}
      {showUpload && (
        <div className="space-y-3">
          {!uploadPreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400 mb-3">PNG, JPG (max 2MB)</p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileUpload}
                className="hidden"
                id={`sig-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
              />
              <label
                htmlFor={`sig-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
                className="inline-flex items-center gap-1.5 bg-[#2563EB] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#1d4ed8] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Choose File
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Preview:</p>
              <img
                src={uploadPreview}
                alt="Signature Preview"
                className="max-h-24 object-contain bg-white border border-gray-200 rounded-lg p-2 mx-auto"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={saveUploadedSignature}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving...' : 'Save Uploaded Signature'}
                </button>
                <button
                  onClick={() => setUploadPreview(null)}
                  className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Choose Different
                </button>
                <button
                  onClick={() => { setShowUpload(false); setUploadPreview(null); }}
                  className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
