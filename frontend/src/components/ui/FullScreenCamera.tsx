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

  const placeRight = isTabletOrUp && !isPortrait;

  return (
    <div className="fixed inset-0 z-[100] bg-black h-[100dvh] w-[100vw]" style={{ contain: 'layout paint size' }}>
      <div className="relative h-full w-full overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Botão fechar no topo direito */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[101] p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Botão capturar flutuante: retrato (rodapé) ou paisagem (lado direito) em tablets */}
        <button
          onClick={handleCapture}
          className={
            placeRight
              ? 'absolute top-1/2 -translate-y-1/2 right-4 md:right-6 z-[101] px-6 py-4 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl active:scale-95'
              : 'absolute left-1/2 -translate-x-1/2 z-[101] bottom-6 md:bottom-8 px-6 py-4 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl active:scale-95'
          }
          style={
            placeRight
              ? { marginRight: 'env(safe-area-inset-right, 0px)' }
              : { paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }
          }
        >
          <span className="flex items-center gap-2"><Camera className="w-6 h-6" /> Capturar</span>
        </button>
      </div>
    </div>
  );
};


