import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Download, RotateCcw, Crop, Palette, Sun, Contrast } from 'lucide-react';
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

interface DocumentScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePDF: (pdfBlob: Blob, fileName: string) => void;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({ isOpen, onClose, onSavePDF }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [corners, setCorners] = useState<Point[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [opencvLoaded, setOpencvLoaded] = useState(false);
  const [filters, setFilters] = useState({
    brightness: 0,
    contrast: 0,
    grayscale: false,
    invert: false
  });

  // Carregar OpenCV.js
  useEffect(() => {
    if (window.cv) {
      setOpencvLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/master/opencv.js';
    script.async = true;
    script.onload = () => {
      if (window.cv?.onRuntimeInitialized) {
        window.cv.onRuntimeInitialized = () => {
          setOpencvLoaded(true);
        };
      } else {
        // Se já estiver inicializado
        setTimeout(() => setOpencvLoaded(true), 100);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Inicializar câmera
  useEffect(() => {
    const startCamera = async () => {
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
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error('Erro ao iniciar câmera:', err);
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
      }
    };
  }, [isOpen, capturedImage, onClose]);

  // Detectar contornos do documento
  const detectDocumentContours = useCallback((imageData: ImageData) => {
    if (!opencvLoaded || !window.cv) return [];

    try {
      const src = window.cv.matFromImageData(imageData);
      const gray = new window.cv.Mat();
      const blur = new window.cv.Mat();
      const thresh = new window.cv.Mat();
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();

      // Converter para escala de cinza
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
      
      // Aplicar desfoque gaussiano
      window.cv.GaussianBlur(gray, blur, new window.cv.Size(5, 5), 0);
      
      // Aplicar threshold adaptativo
      window.cv.adaptiveThreshold(blur, thresh, 255, window.cv.ADAPTIVE_THRESH_GAUSSIAN_C, window.cv.THRESH_BINARY, 11, 2);
      
      // Encontrar contornos
      window.cv.findContours(thresh, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE);
      
      let largestContour = null;
      let maxArea = 0;
      
      // Encontrar o maior contorno com 4 vértices
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = window.cv.contourArea(contour);
        
        if (area > maxArea) {
          const approx = new window.cv.Mat();
          const peri = window.cv.arcLength(contour, true);
          window.cv.approxPolyDP(contour, approx, 0.02 * peri, true);
          
          if (approx.rows === 4) {
            largestContour = approx;
            maxArea = area;
          }
          approx.delete();
        }
        contour.delete();
      }
      
      let detectedCorners: Point[] = [];
      if (largestContour) {
        // Extrair os 4 pontos do contorno
        const points = [];
        for (let i = 0; i < 4; i++) {
          const point = largestContour.data32S;
          points.push({
            x: point[i * 2],
            y: point[i * 2 + 1]
          });
        }
        
        // Ordenar pontos (topo-esquerda, topo-direita, baixo-direita, baixo-esquerda)
        points.sort((a, b) => a.y - b.y);
        const topTwo = points.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottomTwo = points.slice(2, 4).sort((a, b) => a.x - b.x);
        
        detectedCorners = [
          topTwo[0],    // topo-esquerda
          topTwo[1],    // topo-direita
          bottomTwo[1], // baixo-direita
          bottomTwo[0]  // baixo-esquerda
        ];
        
        largestContour.delete();
      }
      
      // Cleanup
      src.delete();
      gray.delete();
      blur.delete();
      thresh.delete();
      contours.delete();
      hierarchy.delete();
      
      return detectedCorners;
    } catch (error) {
      console.error('Erro na detecção de contornos:', error);
      return [];
    }
  }, [opencvLoaded]);

  // Capturar imagem
  const handleCapture = useCallback(async () => {
    console.log('handleCapture chamado', { isCapturing, hasVideo: !!videoRef.current });
    
    if (isCapturing || !videoRef.current) {
      console.log('Captura cancelada - condições não atendidas');
      return;
    }
    
    setIsCapturing(true);
    const video = videoRef.current;
    
    // Usar canvas existente
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas não encontrado');
      setIsCapturing(false);
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Não foi possível obter contexto do canvas');
      setIsCapturing(false);
      return;
    }
    
    console.log('Video dimensions:', { width: video.videoWidth, height: video.videoHeight });
    
    // Aguardar se o vídeo ainda não tem dimensões
    if (!video.videoWidth || !video.videoHeight) {
      console.log('Aguardando vídeo carregar...');
      await new Promise(resolve => {
        const checkVideo = () => {
          if (video.videoWidth && video.videoHeight) {
            resolve(true);
          } else {
            setTimeout(checkVideo, 100);
          }
        };
        checkVideo();
      });
    }
    
    // Configurar tamanho do canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Desenhar frame do vídeo no canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Obter dados da imagem
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    setCapturedImage(dataUrl);
    
    // Detectar contornos automaticamente
    if (opencvLoaded) {
      const detectedCorners = detectDocumentContours(imageData);
      if (detectedCorners.length === 4) {
        setCorners(detectedCorners);
      } else {
        // Se não detectou, usar cantos da imagem como padrão
        setCorners([
          { x: canvas.width * 0.1, y: canvas.height * 0.1 },
          { x: canvas.width * 0.9, y: canvas.height * 0.1 },
          { x: canvas.width * 0.9, y: canvas.height * 0.9 },
          { x: canvas.width * 0.1, y: canvas.height * 0.9 }
        ]);
      }
    }
    
    setIsCapturing(false);
    
    // Parar câmera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isCapturing, detectDocumentContours, opencvLoaded]);

  // Aplicar filtros à imagem usando OpenCV
  const applyImageFilters = useCallback((src: any, filters: typeof filters) => {
    if (!opencvLoaded || !window.cv) return src;

    try {
      let processedImage = src.clone();
      
      // Aplicar brilho e contraste
      if (filters.brightness !== 0 || filters.contrast !== 0) {
        const alpha = (filters.contrast + 100) / 100; // contraste
        const beta = filters.brightness; // brilho
        processedImage.convertTo(processedImage, -1, alpha, beta);
      }
      
      // Converter para escala de cinza
      if (filters.grayscale) {
        const gray = new window.cv.Mat();
        window.cv.cvtColor(processedImage, gray, window.cv.COLOR_BGR2GRAY);
        window.cv.cvtColor(gray, processedImage, window.cv.COLOR_GRAY2BGR);
        gray.delete();
      }
      
      // Inverter cores
      if (filters.invert) {
        window.cv.bitwise_not(processedImage, processedImage);
      }
      
      return processedImage;
    } catch (error) {
      console.error('Erro ao aplicar filtros:', error);
      return src;
    }
  }, [opencvLoaded]);

  // Aplicar correção de perspectiva e gerar PDF
  const handleGeneratePDF = useCallback(async () => {
    if (!capturedImage || !canvasRef.current || corners.length !== 4 || !opencvLoaded) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Carregar imagem capturada
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = capturedImage;
      });
      
      // Aplicar correção de perspectiva usando OpenCV
      const src = window.cv.imread(canvas);
      const dst = new window.cv.Mat();
      
      // Pontos de origem (cantos detectados)
      const srcPoints = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
        corners[0].x, corners[0].y,
        corners[1].x, corners[1].y,
        corners[2].x, corners[2].y,
        corners[3].x, corners[3].y
      ]);
      
      // Calcular dimensões do documento corrigido
      const width = 210 * 4; // A4 width em pixels (aprox)
      const height = 297 * 4; // A4 height em pixels (aprox)
      
      // Pontos de destino (retângulo perfeito)
      const dstPoints = window.cv.matFromArray(4, 1, window.cv.CV_32FC2, [
        0, 0,
        width, 0,
        width, height,
        0, height
      ]);
      
      // Calcular matriz de transformação
      const M = window.cv.getPerspectiveTransform(srcPoints, dstPoints);
      
      // Aplicar transformação
      window.cv.warpPerspective(src, dst, M, new window.cv.Size(width, height));
      
      // Aplicar filtros à imagem corrigida
      const filteredImage = applyImageFilters(dst, filters);
      
      // Converter resultado para canvas
      const resultCanvas = document.createElement('canvas');
      window.cv.imshow(resultCanvas, filteredImage);
      
      // Cleanup do filtro se for diferente do dst
      if (filteredImage !== dst) {
        filteredImage.delete();
      }
      
      // Gerar PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgData = resultCanvas.toDataURL('image/jpeg', 0.9);
      pdf.addImage(imgData, 'JPEG', 10, 10, 190, 267);
      
      // Converter para blob
      const pdfBlob = pdf.output('blob');
      const fileName = `documento_${new Date().toISOString().split('T')[0]}.pdf`;
      
      onSavePDF(pdfBlob, fileName);
      
      // Cleanup OpenCV
      src.delete();
      dst.delete();
      srcPoints.delete();
      dstPoints.delete();
      M.delete();
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, corners, opencvLoaded, onSavePDF, filters, applyImageFilters]);

  // Gerenciar arrastar dos pontos
  const handleMouseDown = (index: number) => {
    setIsDragging(true);
    setDragIndex(index);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragIndex === -1 || !overlayCanvasRef.current) return;
    
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (overlayCanvasRef.current.width / rect.width);
    const y = (e.clientY - rect.top) * (overlayCanvasRef.current.height / rect.height);
    
    const newCorners = [...corners];
    newCorners[dragIndex] = { x, y };
    setCorners(newCorners);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragIndex(-1);
  };

  // Renderizar overlay com pontos de ajuste
  useEffect(() => {
    if (!overlayCanvasRef.current || !capturedImage || corners.length !== 4) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Garantir que o canvas tem as dimensões corretas
    const mainCanvas = canvasRef.current;
    if (mainCanvas) {
      canvas.width = mainCanvas.width;
      canvas.height = mainCanvas.height;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar linhas conectando os pontos
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    
    // Desenhar pontos de controle
    corners.forEach((corner, index) => {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [corners, capturedImage]);

  const resetCapture = () => {
    setCapturedImage(null);
    setCorners([]);
    // Reiniciar câmera
    window.location.reload(); // Solução temporária
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-full">
        
        {/* Canvas ocultos mas sempre presentes */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <canvas ref={overlayCanvasRef} style={{ display: 'none' }} />
        
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
            
            {/* Botão capturar */}
            <button
              onClick={handleCapture}
              disabled={isCapturing || !opencvLoaded}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="flex items-center gap-3">
                <Camera className="w-6 h-6" />
                {isCapturing ? 'Capturando...' : !opencvLoaded ? 'Carregando...' : 'Capturar Documento'}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Visualização da imagem capturada */}
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={capturedImage}
                alt="Documento capturado"
                className="max-w-full max-h-full object-contain"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 max-w-full max-h-full object-contain pointer-events-auto cursor-crosshair"
                width={canvasRef.current?.width || 800}
                height={canvasRef.current?.height || 600}
                style={{ display: 'block' }}
                onMouseDown={(e) => {
                  if (!overlayCanvasRef.current) return;
                  const rect = overlayCanvasRef.current.getBoundingClientRect();
                  const x = (e.clientX - rect.left) * (overlayCanvasRef.current.width / rect.width);
                  const y = (e.clientY - rect.top) * (overlayCanvasRef.current.height / rect.height);
                  
                  // Encontrar o ponto mais próximo
                  let closestIndex = 0;
                  let minDistance = Infinity;
                  corners.forEach((corner, index) => {
                    const distance = Math.sqrt((x - corner.x) ** 2 + (y - corner.y) ** 2);
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestIndex = index;
                    }
                  });
                  
                  if (minDistance < 20) {
                    handleMouseDown(closestIndex);
                  }
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
            
            {/* Controles */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
              <button
                onClick={resetCapture}
                className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              
              <div className="text-white text-center bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm">Arraste os pontos vermelhos para ajustar a área do documento</p>
              </div>
              
              <button
                onClick={onClose}
                className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Controles de Filtro */}
            <div className="absolute right-4 top-20 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white max-w-xs">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Filtros
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-2 text-xs mb-1">
                    <Sun className="w-3 h-3" />
                    Brilho: {filters.brightness}
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={filters.brightness}
                    onChange={(e) => setFilters(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="flex items-center gap-2 text-xs mb-1">
                    <Contrast className="w-3 h-3" />
                    Contraste: {filters.contrast}
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={filters.contrast}
                    onChange={(e) => setFilters(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.grayscale}
                      onChange={(e) => setFilters(prev => ({ ...prev, grayscale: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded"
                    />
                    <span className="text-xs">Preto e Branco</span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.invert}
                      onChange={(e) => setFilters(prev => ({ ...prev, invert: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded"
                    />
                    <span className="text-xs">Inverter Cores</span>
                  </label>
                </div>
                
                <Button
                  onClick={() => setFilters({ brightness: 0, contrast: 0, grayscale: false, invert: false })}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Resetar Filtros
                </Button>
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
                disabled={isProcessing || corners.length !== 4}
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