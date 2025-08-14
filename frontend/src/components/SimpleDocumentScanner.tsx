import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

export const SimpleDocumentScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Erro ao acessar câmera:', error);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    // Aguardar o vídeo ter dimensões
    if (!video.videoWidth || !video.videoHeight) {
      console.log('Vídeo ainda não tem dimensões');
      setIsCapturing(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    
    console.log('Imagem capturada!', { width: canvas.width, height: canvas.height });
    setIsCapturing(false);
  };

  const reset = () => {
    setCapturedImage(null);
  };

  const downloadImage = () => {
    if (!capturedImage) return;
    
    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `documento_${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Teste Simples da Câmera</h1>
      
      <div className="mb-4">
        {!capturedImage ? (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-2xl mx-auto border rounded"
              style={{ maxHeight: '400px' }}
            />
            <Button
              onClick={captureImage}
              disabled={isCapturing}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
            >
              {isCapturing ? 'Capturando...' : 'Capturar'}
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <img
              src={capturedImage}
              alt="Capturada"
              className="w-full max-w-2xl mx-auto border rounded mb-4"
              style={{ maxHeight: '400px' }}
            />
            <div className="space-x-2">
              <Button onClick={reset} variant="outline">
                Nova Captura
              </Button>
              <Button onClick={downloadImage}>
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div className="text-sm text-gray-600">
        <p>Debug info:</p>
        <p>Stream: {stream ? 'Ativo' : 'Inativo'}</p>
        <p>Video dimensions: {videoRef.current?.videoWidth || 0} x {videoRef.current?.videoHeight || 0}</p>
        <p>Captured: {capturedImage ? 'Sim' : 'Não'}</p>
      </div>
    </div>
  );
};