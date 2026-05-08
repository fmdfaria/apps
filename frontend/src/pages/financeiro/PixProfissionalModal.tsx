import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AppToast } from '@/services/toast';
import { getProfissional } from '@/services/profissionais';
import type { Profissional } from '@/types/Profissional';
import { buildPixPayload } from '@/utils/pixPayload';

interface PixProfissionalModalProps {
  isOpen: boolean;
  profissionalId?: string;
  profissionalNome?: string;
  valorOriginal?: number;
  onClose: () => void;
}

export default function PixProfissionalModal({
  isOpen,
  profissionalId,
  profissionalNome,
  valorOriginal,
  onClose
}: PixProfissionalModalProps) {
  const [loading, setLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [error, setError] = useState('');

  const pixPayload = useMemo(() => {
    if (!profissional?.pix || !profissional?.tipo_pix) return '';
    return buildPixPayload({
      tipoPix: profissional.tipo_pix,
      pix: profissional.pix,
      nomeProfissional: profissional.nome || profissionalNome || 'PROFISSIONAL',
      valorOriginal
    });
  }, [profissional, profissionalNome, valorOriginal]);

  useEffect(() => {
    const load = async () => {
      if (!isOpen || !profissionalId) return;
      setLoading(true);
      setError('');
      setQrCodeDataUrl('');
      try {
        const profissionalData = await getProfissional(profissionalId);
        setProfissional(profissionalData);
      } catch (err: any) {
        console.error('Erro ao buscar profissional para PIX:', err);
        setError('Não foi possível carregar os dados PIX do profissional.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, profissionalId]);

  useEffect(() => {
    const generateQrCode = async () => {
      if (!pixPayload) return;
      try {
        const dataUrl = await QRCode.toDataURL(pixPayload, {
          width: 280,
          margin: 1
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('Erro ao gerar QR Code PIX:', err);
        setError('Não foi possível gerar o QR Code PIX.');
      }
    };

    generateQrCode();
  }, [pixPayload]);

  const handleCopyPix = async () => {
    if (!pixPayload) return;
    try {
      await navigator.clipboard.writeText(pixPayload);
      AppToast.success('Código PIX copiado', {
        description: 'O código PIX copia e cola foi enviado para a área de transferência.'
      });
    } catch (err) {
      console.error('Erro ao copiar PIX:', err);
      AppToast.error('Não foi possível copiar o código PIX');
    }
  };

  const showMissingPixData = !!profissional && (!profissional.tipo_pix || !profissional.pix);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pix Profissional</DialogTitle>
          <DialogDescription>
            {profissionalNome ? `Pagamento via PIX para ${profissionalNome}.` : 'Pagamento via PIX do profissional.'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-6 text-center text-sm text-gray-500">Carregando dados PIX...</div>
        )}

        {!loading && error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && showMissingPixData && (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Este profissional não possui chave PIX cadastrada.
          </div>
        )}

        {!loading && !error && !showMissingPixData && qrCodeDataUrl && (
          <div className="space-y-3">
            <div className="rounded-md border bg-white p-3">
              <img src={qrCodeDataUrl} alt="QR Code PIX do profissional" className="mx-auto h-64 w-64" />
            </div>

            <div className="rounded-md border bg-gray-50 p-2 text-xs text-gray-700 break-all">
              {pixPayload}
            </div>

            <Button type="button" className="w-full" onClick={handleCopyPix}>
              Copiar código PIX
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
