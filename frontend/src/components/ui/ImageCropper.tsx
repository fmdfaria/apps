import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  isOpen: boolean;
  imageDataUrl: string | null;
  onClose: () => void;
  onCropped: (croppedDataUrl: string) => void;
  // proporção alvo (ex.: A4 retrato ~ 1:1.414, paisagem ~ 1.414:1)
  aspect?: 'A4-portrait' | 'A4-landscape' | 'free';
}

const A4_PORTRAIT_RATIO = 1 / Math.SQRT2; // ~0.707 (largura/altura)
const A4_LANDSCAPE_RATIO = Math.SQRT2; // ~1.414 (largura/altura)

export const ImageCropper: React.FC<ImageCropperProps> = ({ isOpen, imageDataUrl, onClose, onCropped, aspect = 'A4-portrait' }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [internalAspect, setInternalAspect] = useState<'A4-portrait' | 'A4-landscape' | 'free'>(aspect);
  const [scale, setScale] = useState<number>(0.85); // tamanho relativo da seleção

  const aspectRatio = useMemo(() => {
    if (internalAspect === 'A4-portrait') return A4_PORTRAIT_RATIO;
    if (internalAspect === 'A4-landscape') return A4_LANDSCAPE_RATIO;
    return undefined; // livre
  }, [internalAspect]);

  useEffect(() => {
    if (!isOpen || !imageDataUrl) return;
    // inicializar seleção central com base na proporção
    const init = () => {
      const container = containerRef.current;
      const img = imgRef.current;
      if (!container || !img) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      let w = Math.min(cw * scale, ch * scale);
      let h = w;
      if (aspectRatio) {
        if (aspectRatio >= 1) {
          // paisagem (largura maior)
          w = Math.min(cw * scale, ch * scale * aspectRatio);
          h = w / aspectRatio;
        } else {
          // retrato (altura maior)
          h = Math.min(ch * scale, cw * scale / aspectRatio);
          w = h * aspectRatio;
        }
      }
      setSelection({ x: (cw - w) / 2, y: (ch - h) / 2, w, h });
    };
    setTimeout(init, 0);
  }, [isOpen, imageDataUrl, aspectRatio, scale]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!selection) return;
    setIsDragging(true);
    setDragOffset({ dx: e.clientX - selection.x, dy: e.clientY - selection.y });
  };

  const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !selection || !containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const pointX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const pointY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    let x = pointX - dragOffset.dx;
    let y = pointY - dragOffset.dy;
    x = Math.max(0, Math.min(x, cw - selection.w));
    y = Math.max(0, Math.min(y, ch - selection.h));
    setSelection({ ...selection, x, y });
  };

  const onMouseUp = () => setIsDragging(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!selection) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragOffset({ dx: touch.clientX - selection.x, dy: touch.clientY - selection.y });
  };

  const handleConfirm = () => {
    if (!selection || !imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Desenhar a seleção com base no tamanho da imagem exibida
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Calcular offsets da imagem dentro do container (para object-contain)
    const container = containerRef.current!;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
    const drawnWidth = naturalWidth * scale;
    const drawnHeight = naturalHeight * scale;
    const offsetX = (containerWidth - drawnWidth) / 2;
    const offsetY = (containerHeight - drawnHeight) / 2;

    // Seleção relativa à imagem desenhada
    const selXOnImage = Math.max(0, selection.x - offsetX);
    const selYOnImage = Math.max(0, selection.y - offsetY);
    const selWOnImage = Math.min(selection.w, drawnWidth - selXOnImage);
    const selHOnImage = Math.min(selection.h, drawnHeight - selYOnImage);

    // Converter para coordenadas da imagem natural
    const sx = selXOnImage / scale;
    const sy = selYOnImage / scale;
    const sw = selWOnImage / scale;
    const sh = selHOnImage / scale;

    // Exportar no tamanho recortado mantendo qualidade
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCropped(dataUrl);
    onClose();
  };

  const toggleOrientation = () => {
    const next = internalAspect === 'A4-portrait' ? 'A4-landscape' : 'A4-portrait';
    setInternalAspect(next);
  };

  const applyScale = (newScale: number) => {
    setScale(newScale);
    if (!containerRef.current || !selection) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const centerX = selection.x + selection.w / 2;
    const centerY = selection.y + selection.h / 2;
    let w = Math.min(cw * newScale, ch * newScale);
    let h = w;
    if (aspectRatio) {
      if (aspectRatio >= 1) {
        w = Math.min(cw * newScale, ch * newScale * aspectRatio);
        h = w / aspectRatio;
      } else {
        h = Math.min(ch * newScale, cw * newScale / aspectRatio);
        w = h * aspectRatio;
      }
    }
    let x = centerX - w / 2;
    let y = centerY - h / 2;
    x = Math.max(0, Math.min(x, cw - w));
    y = Math.max(0, Math.min(y, ch - h));
    setSelection({ x, y, w, h });
  };

  if (!isOpen || !imageDataUrl) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <div className="font-semibold">Ajustar Recorte (A4)</div>
        <button onClick={onClose} className="p-2 rounded hover:bg-white/10">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove as any}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onMouseMove as any}
        onTouchEnd={onMouseUp}
      >
        <img ref={imgRef} src={imageDataUrl} className="w-full h-full object-contain select-none" alt="" />
        {selection && (
          <div
            className="absolute border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
            style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="p-4 flex flex-col items-center justify-center gap-3 text-white">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleOrientation}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
          >
            {internalAspect === 'A4-portrait' ? 'Orientação: Retrato' : 'Orientação: Paisagem'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-80">Tamanho</span>
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.01}
              value={scale}
              onChange={(e) => applyScale(parseFloat(e.target.value))}
            />
          </div>
        </div>
        <button
          onClick={handleConfirm}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
        >
          <Check className="w-5 h-5" /> Confirmar recorte
        </button>
      </div>
    </div>
  );
};


