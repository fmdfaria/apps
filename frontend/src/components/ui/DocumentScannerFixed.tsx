import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Download, RotateCcw, Palette, Sun, Contrast, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';

declare global {
  interface Window {
    cv: any;
  }
}

interface Point {
  x: number;
  y: number;
}

interface DocumentScannerFixedProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePDF: (pdfBlob: Blob, fileName: string) => void;
}

export const DocumentScannerFixed: React.FC<DocumentScannerFixedProps> = ({ 
  isOpen, 
  onClose, 
  onSavePDF 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [corners, setCorners] = useState<Point[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [opencvLoaded, setOpencvLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(-1);
  const [filters, setFilters] = useState({
    brightness: 0,
    contrast: 0,
    grayscale: false
  });
  const [pdfOrientation, setPdfOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');

  // Carregar OpenCV.js
  useEffect(() => {
    const loadOpenCV = async () => {
      if (window.cv && window.cv.Mat) {
        setOpencvLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/master/opencv.js';
      script.async = true;
      script.onload = () => {
        const checkOpenCV = () => {
          if (window.cv && window.cv.Mat) {
            setOpencvLoaded(true);
          } else {
            setTimeout(checkOpenCV, 100);
          }
        };
        checkOpenCV();
      };
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    };

    if (isOpen) {
      loadOpenCV();
    }
  }, [isOpen]);

  // Inicializar câmera
  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log('Iniciando câmera...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          console.log('Câmera iniciada com sucesso');
        }
      } catch (err) {
        console.error('Erro ao iniciar câmera:', err);
        alert('Erro ao acessar câmera. Verifique as permissões.');
        onClose();
      }
    };

    if (isOpen && !capturedImage) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        console.log('Câmera parada');
      }
    };
  }, [isOpen, capturedImage, onClose]);

  // Capturar imagem
  const handleCapture = useCallback(async () => {
    console.log('Iniciando captura...');
    
    if (isCapturing || !videoRef.current) {
      console.log('Captura cancelada - condições não atendidas');
      return;
    }
    
    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      
      // Aguardar vídeo ter dimensões
      if (!video.videoWidth || !video.videoHeight) {
        console.log('Aguardando vídeo carregar...');
        let attempts = 0;
        while ((!video.videoWidth || !video.videoHeight) && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!video.videoWidth || !video.videoHeight) {
          throw new Error('Vídeo não carregou adequadamente');
        }
      }
      
      console.log('Dimensões do vídeo:', video.videoWidth, 'x', video.videoHeight);
      
      // Criar canvas temporário para captura
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Não foi possível obter contexto do canvas');
      }
      
      // Capturar frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      console.log('Imagem capturada!');
      setCapturedImage(dataUrl);
      
      // Configurar canvas principal
      if (canvasRef.current) {
        canvasRef.current.width = canvas.width;
        canvasRef.current.height = canvas.height;
        const mainCtx = canvasRef.current.getContext('2d');
        if (mainCtx) {
          mainCtx.drawImage(canvas, 0, 0);
        }
      }
      
      // Definir cantos padrão
      setCorners([
        { x: canvas.width * 0.1, y: canvas.height * 0.1 },
        { x: canvas.width * 0.9, y: canvas.height * 0.1 },
        { x: canvas.width * 0.9, y: canvas.height * 0.9 },
        { x: canvas.width * 0.1, y: canvas.height * 0.9 }
      ]);
      
      // Parar câmera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
    } catch (error) {
      console.error('Erro na captura:', error);
      alert('Erro ao capturar imagem: ' + error.message);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  // Gerar PDF
  const handleGeneratePDF = useCallback(async () => {
    if (!capturedImage || corners.length !== 4) {
      alert('Imagem ou cantos não definidos');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log('Gerando PDF...');
      
      // Determinar orientação do PDF
      let orientation: 'portrait' | 'landscape';
      
      if (pdfOrientation === 'auto') {
        // Detectar orientação da tela/dispositivo
        const isLandscape = window.innerWidth > window.innerHeight;
        orientation = isLandscape ? 'landscape' : 'portrait';
        console.log('Orientação detectada automaticamente:', orientation, `${window.innerWidth}x${window.innerHeight}`);
      } else {
        orientation = pdfOrientation;
        console.log('Orientação manual selecionada:', orientation);
      }
      
      // Criar PDF com orientação apropriada
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });
      
      // Calcular dimensões baseadas na orientação
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      console.log('Dimensões da página PDF:', `${pageWidth}x${pageHeight}mm`);
      
      // Margem de 10mm em todos os lados
      const margin = 10;
      const availableWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);
      
      // Criar uma imagem temporária para calcular proporções
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = capturedImage;
      });
      
      const imageAspectRatio = img.width / img.height;
      const pageAspectRatio = availableWidth / availableHeight;
      
      let finalWidth, finalHeight;
      
      // Ajustar imagem para caber na página mantendo proporção
      if (imageAspectRatio > pageAspectRatio) {
        // Imagem é mais larga - ajustar pela largura
        finalWidth = availableWidth;
        finalHeight = availableWidth / imageAspectRatio;
      } else {
        // Imagem é mais alta - ajustar pela altura
        finalHeight = availableHeight;
        finalWidth = availableHeight * imageAspectRatio;
      }
      
      // Centralizar a imagem na página
      const x = margin + (availableWidth - finalWidth) / 2;
      const y = margin + (availableHeight - finalHeight) / 2;
      
      console.log('Posicionamento da imagem:', { x, y, width: finalWidth, height: finalHeight });
      
      // Adicionar imagem ao PDF
      pdf.addImage(capturedImage, 'JPEG', x, y, finalWidth, finalHeight);
      
      const pdfBlob = pdf.output('blob');
      const fileName = `documento_${orientation}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      console.log('PDF gerado:', fileName);
      onSavePDF(pdfBlob, fileName);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, corners, onSavePDF]);

  // Funções para arrastar pontos
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overlayCanvasRef.current || corners.length !== 4) return;
    
    const canvas = overlayCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Encontrar o ponto mais próximo
    let closestIndex = -1;
    let minDistance = Infinity;
    
    corners.forEach((corner, index) => {
      const distance = Math.sqrt((x - corner.x) ** 2 + (y - corner.y) ** 2);
      if (distance < minDistance && distance < 40) { // 40px de tolerância (aumentado para pontos maiores)
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    if (closestIndex !== -1) {
      setIsDragging(true);
      setDragIndex(closestIndex);
      console.log('Iniciando arraste do ponto', closestIndex);
    }
  }, [corners]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || dragIndex === -1 || !overlayCanvasRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Limitar aos bounds do canvas
    const boundedX = Math.max(0, Math.min(canvas.width, x));
    const boundedY = Math.max(0, Math.min(canvas.height, y));
    
    const newCorners = [...corners];
    newCorners[dragIndex] = { x: boundedX, y: boundedY };
    setCorners(newCorners);
  }, [isDragging, dragIndex, corners]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      console.log('Finalizando arraste do ponto', dragIndex);
    }
    setIsDragging(false);
    setDragIndex(-1);
  }, [isDragging, dragIndex]);

  // Renderizar overlay
  useEffect(() => {
    if (!overlayCanvasRef.current || !canvasRef.current || corners.length !== 4) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Usar as dimensões do canvas principal
    const mainCanvas = canvasRef.current;
    
    // Definir dimensões do canvas overlay para corresponder ao canvas principal
    if (canvas.width !== mainCanvas.width || canvas.height !== mainCanvas.height) {
      canvas.width = mainCanvas.width;
      canvas.height = mainCanvas.height;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar linhas conectoras
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Desenhar pontos de controle
    corners.forEach((corner, index) => {
      // Círculo externo (vermelho) - aumentado de 15 para 20
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 20, 0, 2 * Math.PI);
      ctx.fill();
      
      // Círculo interno (branco) - aumentado de 8 para 12
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      // Número do ponto - aumentado de 12px para 16px
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), corner.x, corner.y);
    });
    
    console.log('Overlay renderizado com', corners.length, 'pontos');
  }, [corners]);

  const resetCapture = () => {
    setCapturedImage(null);
    setCorners([]);
    setPdfOrientation('auto'); // Resetar para automático
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-full">
        
        {/* Canvas principais sempre presentes */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {!capturedImage ? (
          <>
            {/* Visualização da câmera */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            
            {/* Botão fechar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-[10001] p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Status OpenCV */}
            {!opencvLoaded && (
              <div className="absolute top-4 left-4 bg-yellow-500/80 text-black px-3 py-1 rounded text-sm">
                Carregando OpenCV...
              </div>
            )}
            
            {/* Botão capturar */}
            <button
              onClick={handleCapture}
              disabled={isCapturing}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                <Camera className="w-6 h-6" />
                {isCapturing ? 'Capturando...' : 'Capturar Documento'}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Visualização da imagem capturada */}
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Documento capturado"
                  className="max-w-full max-h-full object-contain"
                  style={{ display: 'block' }}
                />
                
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute top-0 left-0 cursor-pointer"
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    pointerEvents: 'auto'
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const mouseEvent = new MouseEvent('mousedown', {
                      clientX: touch.clientX,
                      clientY: touch.clientY
                    });
                    handleMouseDown(mouseEvent as any);
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const mouseEvent = new MouseEvent('mousemove', {
                      clientX: touch.clientX,
                      clientY: touch.clientY
                    });
                    handleMouseMove(mouseEvent as any);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleMouseUp();
                  }}
                />
              </div>
            </div>
            
            {/* Controles */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
              <button
                onClick={resetCapture}
                className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              
              <div className="text-white text-center bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 max-w-md">
                <p className="text-sm font-semibold">📄 Documento Capturado!</p>
                <p className="text-xs mt-1">Arraste os pontos numerados (1-4) para ajustar as bordas do documento</p>
                {isDragging && (
                  <p className="text-xs mt-1 text-green-300">✋ Movendo ponto {dragIndex + 1}</p>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Controle de Orientação do PDF */}
            <div className="absolute right-4 top-20 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white">
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
                <RotateCw className="w-3 h-3" />
                Orientação PDF
              </h3>
              
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="orientation"
                    value="auto"
                    checked={pdfOrientation === 'auto'}
                    onChange={(e) => setPdfOrientation(e.target.value as 'auto')}
                    className="w-3 h-3"
                  />
                  <span className="text-xs">Automático</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="orientation"
                    value="portrait"
                    checked={pdfOrientation === 'portrait'}
                    onChange={(e) => setPdfOrientation(e.target.value as 'portrait')}
                    className="w-3 h-3"
                  />
                  <span className="text-xs">📄 Vertical</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="orientation"
                    value="landscape"
                    checked={pdfOrientation === 'landscape'}
                    onChange={(e) => setPdfOrientation(e.target.value as 'landscape')}
                    className="w-3 h-3"
                  />
                  <span className="text-xs">📄 Horizontal</span>
                </label>
              </div>
              
              <div className="text-xs text-gray-300 mt-2">
                Atual: {pdfOrientation === 'auto' ? 
                  (window.innerWidth > window.innerHeight ? 'horizontal' : 'vertical') : 
                  pdfOrientation === 'landscape' ? 'horizontal' : 'vertical'}
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
              <Button
                onClick={resetCapture}
                variant="outline"
                className="bg-black/50 backdrop-blur-sm text-white border-white/30 hover:bg-black/70"
              >
                <Camera className="w-4 h-4 mr-2" />
                Nova Captura
              </Button>
              
              <Button
                onClick={handleGeneratePDF}
                disabled={isProcessing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Gerar PDF
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};