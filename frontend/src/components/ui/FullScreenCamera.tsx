import React, { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';

interface FullScreenCameraProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const FullScreenCamera: React.FC<FullScreenCameraProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isPortrait, setIsPortrait] = useState(true);
  const [isTabletOrUp, setIsTabletOrUp] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

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
        (videoRef.current as any).srcObject = null;
      }
    };
  }, [isOpen, onClose]);

  // Detectar orientação
  useEffect(() => {
    const mql = window.matchMedia('(orientation: portrait)');
    const onChange = () => setIsPortrait(mql.matches);
    onChange();
    if ((mql as any).addEventListener) (mql as any).addEventListener('change', onChange);
    else if ((mql as any).addListener) (mql as any).addListener(onChange);
    return () => {
      if ((mql as any).removeEventListener) (mql as any).removeEventListener('change', onChange);
      else if ((mql as any).removeListener) (mql as any).removeListener(onChange);
    };
  }, []);

  // Detectar se é tablet ou maior (largura >= 768px)
  useEffect(() => {
    const onResize = () => setIsTabletOrUp(window.innerWidth >= 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleCapture = () => {
    if (isCapturing) return;
    if (!videoRef.current) return;
    setIsCapturing(true);
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
  };

  if (!isOpen) return null;

  const placeRight = isTabletOrUp && !isPortrait;

  return (
    <div className="fixed inset-0 z-[9999] bg-black h-[100dvh] w-[100vw] flex items-center justify-center" style={{ contain: 'layout paint size', padding: '12px' }}>
      <div className="relative w-full h-full max-w-4xl max-h-full overflow-hidden rounded-xl border-4 border-white/90">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Botão fechar no topo direito */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[10001] p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Botão capturar flutuante: retrato (rodapé) ou paisagem (lado direito) em tablets */}
        <button
          onClick={handleCapture}
          className={
            placeRight
              ? 'absolute top-1/2 -translate-y-1/2 right-6 md:right-10 z-[10001] px-7 py-5 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl active:scale-95'
              : 'absolute left-1/2 -translate-x-1/2 z-[10001] bottom-10 md:bottom-14 px-7 py-5 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl active:scale-95'
          }
          type="button"
          disabled={isCapturing}
          aria-label="Capturar foto"
          title="Capturar foto"
          style={{ touchAction: 'manipulation' }}
        >
          <span className="flex items-center gap-2"><Camera className="w-6 h-6" /> {isCapturing ? 'Capturando...' : 'Capturar'}</span>
        </button>
      </div>
    </div>
  );
};


