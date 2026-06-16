import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Camera, Upload, Loader2, User, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  bucket: 'avatars' | 'student-photos';
  folder?: string;
  entityId: string;
  onSuccess: (url: string) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PhotoUpload({
  currentPhotoUrl,
  bucket,
  folder = '',
  entityId,
  onSuccess,
  label = 'Photo',
  size = 'md',
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sizeMap = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' };
  const displayUrl = preview || currentPhotoUrl;

  const uploadPhoto = async (dataUrl: string) => {
    setUploading(true);
    try {
      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const path = folder ? `${folder}/${entityId}.${ext}` : `${entityId}.${ext}`;

      // Ensure bucket exists by trying to upload (creates if not exists via upsert)
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { upsert: true, contentType: blob.type });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(uploadError.message || 'Upload to storage failed');
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      setPreview(publicUrl);
      onSuccess(publicUrl);
      toast.success(`${label} uploaded successfully!`);
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large. Max 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      uploadPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error('Camera not available. Please use file upload instead.');
    }
  };

  const switchCamera = async () => {
    stopCamera();
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    setTimeout(() => startCamera(), 100);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    setPreview(dataUrl);
    uploadPhoto(dataUrl);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Photo Preview */}
      <div className={`${sizeMap[size]} rounded-full overflow-hidden border-2 border-blue-200 bg-gray-100 flex items-center justify-center relative`}>
        {displayUrl ? (
          <img src={displayUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <User className="w-8 h-8 text-gray-400" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Capture Photo</h3>
              <button onClick={stopCamera}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-2 text-center">
              {facingMode === 'user' ? '📱 Front Camera' : '📷 Rear Camera'}
            </p>
            <video ref={videoRef} className="w-full rounded-xl mb-3" autoPlay playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2 mb-3">
              <button onClick={switchCamera} className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg text-xs font-medium hover:bg-gray-300 transition-colors">Switch Camera</button>
              <button onClick={capturePhoto} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:bg-blue-700 transition-colors">
                <Check className="w-3 h-3" /> Capture
              </button>
            </div>
            <button onClick={stopCamera} className="w-full px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
        <button
          type="button"
          onClick={startCamera}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          <Camera className="w-3.5 h-3.5" />
          Camera
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
