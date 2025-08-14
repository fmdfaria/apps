import React, { useEffect, useRef } from 'react';
import { X, Camera } from 'lucide-react';

interface FullScreenCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const FullScreenCamera: React.FC<FullScreenCameraProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          // @ts-expect-error - srcObject não existe em alguns tipos
          videoRef.current.srcObject = stream;
          const onLoaded = () => {
            try { videoRef.current?.play?.(); } catch {}
            videoRef.current?.removeEventListener('loadedmetadata', onLoaded);
          };
          videoRef.current.addEventListener('loadedmetadata', onLoaded);
        }
      } catch (err) {
        console.error('Erro ao iniciar câmera:', err);
        onClose();
      }
    };

    if (isOpen) {
      start();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        // @ts-expect-error - srcObject não existe em alguns tipos
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, onClose]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onCapture(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <div className="font-semibold">Câmera</div>
        <button onClick={onClose} className="p-2 rounded hover:bg-white/10">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
      </div>
      <div className="p-4 flex items-center justify-center gap-4">
        <button
          onClick={handleCapture}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
        >
          <Camera className="w-5 h-5" /> Capturar
        </button>
      </div>
    </div>
  );
};


