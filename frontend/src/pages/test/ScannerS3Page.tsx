import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppToast } from '@/services/toast';
import { uploadAnexo } from '@/services/anexos';
import { useAuthStore } from '@/store/auth';
import { FullScreenCamera } from '@/components/ui/FullScreenCamera';
import { ImageCropper } from '@/components/ui/ImageCropper';

export const ScannerS3Page: React.FC = () => {
  const { user } = useAuthStore();
  const [entidadeId, setEntidadeId] = useState('teste-entity-001');
  const [modulo, setModulo] = useState('testes');
  const [categoria, setCategoria] = useState('scanner');
  const [descricao, setDescricao] = useState('Documento de teste via scanner');
  const [nomeArquivoBase, setNomeArquivoBase] = useState('documento_teste');
  const [usarPadraoRA, setUsarPadraoRA] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nomeArquivo = useMemo(() => {
    if (!nomeArquivoBase.trim()) return '';
    const limpo = nomeArquivoBase.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    return usarPadraoRA ? `${limpo}_RA_doc1.jpg` : `${limpo}.jpg`;
  }, [nomeArquivoBase, usarPadraoRA]);

  const dataURLtoFile = (dataURL: string, filename: string): File => {
    const arr = dataURL.split(',');
    if (arr.length < 2) throw new Error('Imagem inválida');
    const header = arr[0];
    const base64 = arr[1];
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] || 'image/jpeg';
    const bstr = atob(base64);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCapturedImage((ev.target?.result as string) || null);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!capturedImage) {
      AppToast.error('Selecione ou capture uma imagem', { description: 'Use a câmera ou faça upload de um arquivo.' });
      return;
    }
    if (!entidadeId.trim() || !modulo.trim() || !categoria.trim() || !descricao.trim() || !nomeArquivo.trim()) {
      AppToast.error('Campos obrigatórios', { description: 'Preencha entidadeId, módulo, categoria, descrição e nome do arquivo.' });
      return;
    }
    try {
      setUploading(true);
      const file = dataURLtoFile(capturedImage, nomeArquivo);
      await uploadAnexo({
        file,
        descricao: descricao.trim(),
        entidadeId: entidadeId.trim(),
        modulo: modulo.trim(),
        categoria: categoria.trim(),
        criadoPor: user?.id || 'sistema'
      });
      AppToast.success('Upload realizado', { description: 'Documento salvo no S3 com sucesso.' });
      setCapturedImage(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Falha ao enviar para S3.';
      AppToast.error('Erro no upload', { description: msg });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Teste: Scanner + Upload S3</h1>
      <p className="text-gray-600">Use a câmera ou o upload de arquivo. O envio utiliza o mesmo fluxo do modal de Digitalizar Guias.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3 bg-white p-4 rounded-lg border">
          <label className="text-sm font-medium">Entidade ID</label>
          <Input value={entidadeId} onChange={(e) => setEntidadeId(e.target.value)} />
          <label className="text-sm font-medium">Módulo</label>
          <Input value={modulo} onChange={(e) => setModulo(e.target.value)} />
          <label className="text-sm font-medium">Categoria</label>
          <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          <label className="text-sm font-medium">Descrição</label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
            <div>
              <label className="text-sm font-medium">Nome do arquivo</label>
              <Input value={nomeArquivoBase} onChange={(e) => setNomeArquivoBase(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input id="usarPadraoRA" type="checkbox" checked={usarPadraoRA} onChange={(e) => setUsarPadraoRA(e.target.checked)} />
              <label htmlFor="usarPadraoRA" className="text-sm">Usar padrão _RA_doc1</label>
            </div>
          </div>
          {nomeArquivo && (
            <p className="text-xs text-gray-600">Arquivo gerado: <span className="font-mono">{nomeArquivo}</span></p>
          )}
        </div>

        <div className="space-y-3 bg-white p-4 rounded-lg border">
          <div className="flex gap-2">
            <Button onClick={() => setShowCamera(true)} className="bg-gradient-to-r from-purple-600 to-violet-600">Abrir Câmera</Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Selecionar Arquivo</Button>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
          </div>
          {capturedImage ? (
            <div className="space-y-2">
              <img src={capturedImage} alt="preview" className="max-h-80 w-full object-contain rounded border" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCropper(true)}>Ajustar Recorte (A4)</Button>
                <Button variant="outline" onClick={() => setCapturedImage(null)}>Remover</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma imagem selecionada.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={uploading || !capturedImage || !nomeArquivoBase.trim()} className="bg-gradient-to-r from-green-600 to-emerald-600">
          {uploading ? 'Enviando...' : 'Enviar para S3'}
        </Button>
      </div>

      <FullScreenCamera
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(img) => {
          setCapturedImage(img);
          setShowCamera(false);
          setShowCropper(true);
        }}
      />

      <ImageCropper
        isOpen={showCropper}
        imageDataUrl={capturedImage}
        aspect={'A4-portrait'}
        onClose={() => setShowCropper(false)}
        onCropped={(dataUrl) => {
          setCapturedImage(dataUrl);
          setShowCropper(false);
        }}
      />
    </div>
  );
};

export default ScannerS3Page;



