import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, Upload, Download, X, Check } from 'lucide-react';
import { DocumentScannerFixed } from '@/components/ui/DocumentScannerFixed';
import { ImageCropper } from '@/components/ui/ImageCropper';
import { AppToast } from '@/services/toast';
import type { Agendamento } from '@/types/Agendamento';
import type { Anexo } from '@/types/Anexo';
import { uploadAnexo, getAnexos, deleteAnexo, getAnexoDownloadUrl } from '@/services/anexos';
import { useAuthStore } from '@/store/auth';
import { getUserById } from '@/services/users';

interface DigitalizarGuiasModalProps {
  isOpen: boolean;
  agendamento: Agendamento | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DigitalizarGuiasModal: React.FC<DigitalizarGuiasModalProps> = ({
  isOpen,
  agendamento,
  onClose,
  onSuccess
}) => {
  const { user } = useAuthStore();
  const [showDocumentScanner, setShowDocumentScanner] = useState(false);
  const [modalExpanded, setModalExpanded] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedPdf, setCapturedPdf] = useState<{blob: Blob, fileName: string} | null>(null);
  const [descricao, setDescricao] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [nomeArquivoBase, setNomeArquivoBase] = useState('');
  const [usarPadraoRA, setUsarPadraoRA] = useState(true); // Default ativo
  const [uploading, setUploading] = useState(false);
  const [anexosExistentes, setAnexosExistentes] = useState<Anexo[]>([]);
  const [loadingAnexos, setLoadingAnexos] = useState(true);
  const [deletingAnexo, setDeletingAnexo] = useState(false);
  const [modoDigitalizacao, setModoDigitalizacao] = useState(false);
  const [userNamesCache, setUserNamesCache] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Função para buscar o nome do usuário pelo ID
  const fetchUserName = async (userId: string): Promise<string> => {
    if (!userId) return 'Sistema';
    
    // Se já está no cache, usar o valor cachado
    if (userNamesCache[userId]) {
      return userNamesCache[userId];
    }
    
    try {
      const userData = await getUserById(userId);
      const userName = userData.nome || 'Usuário';
      
      // Atualizar o cache
      setUserNamesCache(prev => ({
        ...prev,
        [userId]: userName
      }));
      
      return userName;
    } catch (error) {
      // Se falhar, armazenar no cache como "Usuário" para evitar requests repetidos
      setUserNamesCache(prev => ({
        ...prev,
        [userId]: 'Usuário'
      }));
      return 'Usuário';
    }
  };

  // Função para formatar o nome do usuário que criou
  const formatarCriadoPor = (criadoPor: string | null | undefined) => {
    if (!criadoPor) return 'Sistema';
    
    // Se já está no cache, retornar imediatamente
    if (userNamesCache[criadoPor]) {
      return userNamesCache[criadoPor];
    }
    
    // Se parece com um UUID (user ID), buscar o nome
    if (criadoPor.length > 20 || criadoPor.includes('-')) {
      // Buscar o nome de forma assíncrona e atualizar o cache
      fetchUserName(criadoPor);
      return 'Carregando...'; // Valor temporário enquanto busca
    }
    
    // Caso contrário, é provavelmente já um nome
    return criadoPor;
  };

  // Carregar anexos existentes quando modal abre
  useEffect(() => {
    if (isOpen && agendamento) {
      carregarAnexosExistentes();
    }
  }, [isOpen, agendamento]);

  // Carregar nomes dos usuários quando anexos são carregados
  useEffect(() => {
    const loadUserNames = async () => {
      const userIds = anexosExistentes
        .map(anexo => anexo.criadoPor)
        .filter((id): id is string => !!id && (id.length > 20 || id.includes('-')))
        .filter(id => !userNamesCache[id]); // Apenas IDs que não estão no cache

      if (userIds.length > 0) {
        // Carregar nomes em paralelo
        const promises = userIds.map(async (userId) => {
          const userName = await fetchUserName(userId);
          return { userId, userName };
        });

        try {
          await Promise.all(promises);
          // Os nomes já foram atualizados no cache pela função fetchUserName
        } catch (error) {
        }
      }
    };

    if (anexosExistentes.length > 0) {
      loadUserNames();
    }
  }, [anexosExistentes]);

  // Função para carregar anexos existentes
  const carregarAnexosExistentes = async () => {
    if (!agendamento) return;
    
    setLoadingAnexos(true);
    try {
      const anexos = await getAnexos(agendamento.id);
      setAnexosExistentes(anexos);
      
      // Se já existe anexo, não entrar no modo digitalização automaticamente
      if (anexos.length > 0) {
        setModoDigitalizacao(false);
      } else {
        setModoDigitalizacao(true);
      }
    } catch (error) {
      AppToast.error('Erro ao carregar anexos', {
        description: 'Não foi possível carregar os anexos existentes.'
      });
      setModoDigitalizacao(true); // Em caso de erro, permitir digitalização
    } finally {
      setLoadingAnexos(false);
    }
  };


  // Função para deletar anexo existente
  const handleDeleteAnexo = async (anexo: Anexo) => {
    setDeletingAnexo(true);
    try {
      await deleteAnexo(anexo.id);
      setAnexosExistentes(prev => prev.filter(a => a.id !== anexo.id));
      AppToast.success('Documento removido com sucesso!', {
        description: 'Agora você pode digitalizar um novo documento.'
      });
      
      // Se não há mais anexos, entrar no modo digitalização
      const anexosRestantes = anexosExistentes.filter(a => a.id !== anexo.id);
      if (anexosRestantes.length === 0) {
        setModoDigitalizacao(true);
      }
    } catch (error) {
      AppToast.error('Erro ao remover documento', {
        description: 'Não foi possível remover o documento digitalizado.'
      });
    } finally {
      setDeletingAnexo(false);
    }
  };

  const handleDownloadAnexo = async (anexo: Anexo) => {
    try {
      const downloadUrl = await getAnexoDownloadUrl(anexo.id);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Erro ao obter URL de download do anexo:', error);
      AppToast.error('Erro ao abrir documento', {
        description: 'Nao foi possivel gerar o link de download. Tente novamente.'
      });
    }
  };

  // Função para gerar o nome completo do arquivo
  const gerarNomeCompleto = (textoBase: string, usarPadrao: boolean, isPdf: boolean = false) => {
    if (!textoBase.trim()) return '';
    // Remover caracteres especiais e espaços, manter apenas letras, números e underscore
    const textoLimpo = textoBase.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    const extensao = isPdf ? '.pdf' : '.jpg';
    return usarPadrao ? `${textoLimpo}_RA_doc1${extensao}` : `${textoLimpo}${extensao}`;
  };

  // Função para atualizar o nome do arquivo
  const handleNomeArquivoChange = (valor: string) => {
    setNomeArquivoBase(valor);
    const isPdf = !!capturedPdf; // Se há PDF capturado, usar extensão .pdf
    setNomeArquivo(gerarNomeCompleto(valor, usarPadraoRA, isPdf));
  };

  // Função para atualizar quando o checkbox muda
  const handleUsarPadraoRAChange = (checked: boolean) => {
    setUsarPadraoRA(checked);
    const isPdf = !!capturedPdf; // Se há PDF capturado, usar extensão .pdf
    setNomeArquivo(gerarNomeCompleto(nomeArquivoBase, checked, isPdf));
  };

  // Função para lidar com o PDF gerado pelo DocumentScanner
  const handleDocumentScannerPDF = (pdfBlob: Blob, fileName: string) => {
    setCapturedPdf({ blob: pdfBlob, fileName });
    setShowDocumentScanner(false);
    setModalExpanded(false); // Retorna ao modal normal após captura
    
    // Atualizar o nome do arquivo baseado no padrão atual
    if (nomeArquivoBase.trim()) {
      setNomeArquivo(gerarNomeCompleto(nomeArquivoBase, usarPadraoRA, true));
    }
    
  };

  // Função para abrir o scanner de documentos
  const openDocumentScanner = () => {
    setModalExpanded(true);
    setShowDocumentScanner(true);
  };

  // Função para fechar o scanner e retornar ao modal normal
  const handleScannerClose = () => {
    setShowDocumentScanner(false);
    setModalExpanded(false);
  };

  const dataURLtoFile = (dataURL: string, filename: string): File => {
    const arr = dataURL.split(',');
    if (arr.length < 2) {
      throw new Error('Imagem inválida ou não capturada corretamente.');
    }
    const header = arr[0];
    const base64 = arr[1];
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] || 'image/jpeg';
    const bstr = atob(base64);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    // Verificar se temos imagem OU PDF
    if (!capturedImage && !capturedPdf) {
      AppToast.error('Documento é obrigatório', {
        description: 'Capture um documento ou selecione um arquivo para continuar.'
      });
      return;
    }

    if (!agendamento) {
      AppToast.error('Erro no agendamento', {
        description: 'Informações do agendamento não encontradas.'
      });
      return;
    }

    if (!descricao.trim()) {
      AppToast.error('Descrição é obrigatória', {
        description: 'Informe uma descrição para o documento digitalizado.'
      });
      return;
    }

    // Nome é obrigatório tanto para imagens quanto para PDFs
    if ((capturedImage || capturedPdf) && !nomeArquivoBase.trim()) {
      AppToast.error('Nome do arquivo é obrigatório', {
        description: 'Informe um nome para o arquivo.'
      });
      return;
    }

    setUploading(true);

    try {
      let file: File;

      if (capturedPdf) {
        // Usar PDF gerado pelo DocumentScanner com nome personalizado
        const pdfFileName = nomeArquivo || capturedPdf.fileName;
        file = new File([capturedPdf.blob], pdfFileName, { type: 'application/pdf' });
      } else if (capturedImage) {
        // Usar imagem (funcionalidade antiga)
        file = dataURLtoFile(capturedImage, nomeArquivo);
      } else {
        throw new Error('Nenhum arquivo para upload');
      }

      await uploadAnexo({
        file,
        descricao: descricao.trim(),
        entidadeId: agendamento.id,
        modulo: 'agendamentos',
        categoria: 'guias',
        criadoPor: user?.id || 'sistema'
      });

      // Resetar estados e fechar modal primeiro
      resetCapture();
      setModoDigitalizacao(false);
      handleClose();
      onSuccess();
      
      // Mostrar toast após fechar o modal
      setTimeout(() => {
        AppToast.success('Documento digitalizado com sucesso!', {
          description: 'O documento foi anexado ao agendamento.'
        });
      }, 100);
    } catch (error: unknown) {
      let message = 'Erro ao salvar o documento digitalizado.';
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { message?: string } } };
        if (errorResponse.response?.data?.message) {
          message = errorResponse.response.data.message;
        }
      }
      
      AppToast.error('Erro ao salvar documento', {
        description: message
      });
    } finally {
      setUploading(false);
    }
  };

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      // Cleanup se necessário
      setCapturedImage(null);
      setCapturedPdf(null);
    };
  }, []);

  const handleClose = () => {
    setShowDocumentScanner(false);
    setModalExpanded(false);
    setCapturedImage(null);
    setCapturedPdf(null);
    setDescricao('');
    setNomeArquivo('');
    setNomeArquivoBase('');
    setUsarPadraoRA(true);
    setUploading(false);
    setAnexosExistentes([]);
    setLoadingAnexos(true);
    setDeletingAnexo(false);
    setModoDigitalizacao(false);
    setUserNamesCache({});
    onClose();
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setCapturedPdf(null);
    setDescricao('');
    setNomeArquivo('');
    setNomeArquivoBase('');
    setUsarPadraoRA(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={modalExpanded ? "max-w-[95vw] max-h-[95vh] w-full h-full overflow-hidden" : "max-w-4xl max-h-[90vh] overflow-y-auto"}>
        <DialogHeader className="bg-gradient-to-r from-purple-50 to-violet-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <Camera className="w-6 h-6 text-purple-600" />
            Digitalizar Guias - {agendamento?.pacienteNome}
          </DialogTitle>
        </DialogHeader>

        <div className={modalExpanded ? "flex-1 overflow-hidden" : "mt-4 space-y-4"}>
          {modalExpanded && showDocumentScanner ? (
            <div className="absolute inset-0 z-50">
              {/* DocumentScanner integrado diretamente - ocupa toda a tela do modal expandido */}
              <DocumentScannerFixed
                isOpen={true}
                onClose={handleScannerClose}
                onSavePDF={handleDocumentScannerPDF}
              />
            </div>
          ) : loadingAnexos ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verificando guias existentes...</p>
            </div>
          ) : (
            <>
              {/* Mostrar anexos existentes se houver */}
              {anexosExistentes.length > 0 && !modoDigitalizacao && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      📄 Documento Digitalizado
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {anexosExistentes.map((anexo) => (
                      <div key={anexo.id} className="bg-white rounded-lg p-4 border border-green-300 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                📄
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-800">{anexo.nomeArquivo}</h4>
                                <p className="text-sm text-gray-600">{anexo.descricao}</p>
                                <p className="text-xs text-gray-500">
                                  Enviado por: <span className="font-medium text-blue-600">{formatarCriadoPor(anexo.criadoPor)}</span> em {new Date(anexo.createdAt).toLocaleDateString('pt-BR')} às {new Date(anexo.createdAt).toLocaleTimeString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadAnexo(anexo)}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Visualizar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteAnexo(anexo)}
                              disabled={deletingAnexo}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              {deletingAnexo ? (
                                <>⏳ Removendo...</>
                              ) : (
                                <>
                                  <X className="w-4 h-4 mr-1" />
                                  Remover
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 flex items-center gap-2">
                      ℹ️ <strong>Este agendamento já possui um documento digitalizado.</strong> Para substituí-lo, remova o documento atual primeiro.
                    </p>
                  </div>
                </div>
              )}

              {/* Interface de digitalização - só disponível quando não há anexos */}
              {modoDigitalizacao && anexosExistentes.length === 0 && (
                <>
                  {!capturedImage && !capturedPdf && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Opção de Câmera */}
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 border-2 border-purple-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Camera className="w-5 h-5 text-purple-600" />
                          Scanner Inteligente
                        </h3>
                        
                        <div className="text-center py-6">
                          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Camera className="w-8 h-8 text-purple-600" />
                          </div>
                          <p className="text-gray-600 mb-2">
                            <strong>Scanner Adobe-style</strong>
                          </p>
                          <Button
                            onClick={openDocumentScanner}
                            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Scanner de Documentos
                          </Button>
                        </div>
                      </div>

                      {/* Opção de Upload */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Upload className="w-5 h-5 text-blue-600" />
                          Upload de Arquivo
                        </h3>
                        
                        <div className="text-center py-6">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-blue-600" />
                          </div>
                          <p className="text-gray-600 mb-4">
                            Selecione uma imagem da galeria
                          </p>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            className="border-blue-300 text-blue-600 hover:bg-blue-50"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Selecionar Arquivo
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(capturedImage || capturedPdf) && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-600" />
                            Documento Capturado
                          </h3>
                          <Button
                            onClick={resetCapture}
                            variant="outline"
                            size="sm"
                            className="border-gray-300"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Nova Captura
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            {capturedPdf ? (
                              <div className="w-full rounded-lg border-2 border-green-300 p-8 bg-white text-center">
                                <div className="text-6xl mb-4">📄</div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">PDF Gerado</h3>
                                <p className="text-sm text-gray-600 mb-2">
                                  <strong>Arquivo:</strong> {capturedPdf.fileName}
                                </p>
                                <p className="text-sm text-gray-600 mb-4">
                                  <strong>Tamanho:</strong> {Math.round(capturedPdf.blob.size / 1024)} KB
                                </p>
                                <Button
                                  onClick={() => {
                                    const url = URL.createObjectURL(capturedPdf.blob);
                                    window.open(url, '_blank');
                                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Visualizar PDF
                                </Button>
                              </div>
                            ) : capturedImage ? (
                              <img
                                src={capturedImage}
                                alt="Documento capturado"
                                className="w-full rounded-lg border-2 border-green-300 max-h-96 object-contain"
                              />
                            ) : null}
                          </div>
                          
                          <div className="space-y-3">
                            {/* Campo de nome do arquivo - para imagens e PDFs */}
                            {(capturedImage || capturedPdf) && (
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  📁 Nome do Arquivo *
                                </label>
                                <input
                                  type="text"
                                  value={nomeArquivoBase}
                                  onChange={(e) => handleNomeArquivoChange(e.target.value)}
                                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 hover:border-green-300"
                                  placeholder="Ex: guia_consulta, autorizacao_exame"
                                  disabled={uploading}
                                />
                                
                                <div className="mt-3 flex items-center space-x-2">
                                  <Checkbox
                                    id="usarPadraoRA"
                                    checked={usarPadraoRA}
                                    onCheckedChange={(checked) => handleUsarPadraoRAChange(checked as boolean)}
                                    disabled={uploading}
                                  />
                                  <label htmlFor="usarPadraoRA" className="text-sm font-medium text-gray-700 flex items-center gap-1 cursor-pointer">
                                    ⚙️ Usar padrão '_RA_doc1'
                                  </label>
                                </div>

                                {nomeArquivo && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-700 font-medium">
                                      📄 Arquivo será salvo como: <span className="font-mono bg-blue-100 px-1 rounded">{nomeArquivo}</span>
                                    </p>
                                  </div>
                                )}
                                
                                <p className="text-xs text-gray-500 mt-1">
                                  💡 Formato: {usarPadraoRA ? 
                                    (capturedPdf ? '[seu_texto]_RA_doc1.pdf' : '[seu_texto]_RA_doc1.jpg') : 
                                    (capturedPdf ? '[seu_texto].pdf' : '[seu_texto].jpg')}
                                </p>
                              </div>
                            )}
                            
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                📝 Descrição do Documento *
                              </label>
                              <textarea
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-green-100 focus:border-green-500 transition-all duration-200 hover:border-green-300 resize-none"
                                placeholder="Ex: Guia de consulta, Autorização de exame, etc..."
                                rows={3}
                                disabled={uploading}
                              />
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Informações do Agendamento:</h4>
                              <div className="space-y-1 text-xs text-gray-600">
                                <p><strong>Paciente:</strong> {agendamento?.pacienteNome}</p>
                                <p><strong>Profissional:</strong> {agendamento?.profissionalNome}</p>
                                <p><strong>Serviço:</strong> {agendamento?.servicoNome}</p>
                                <p><strong>Data:</strong> {agendamento?.dataHoraInicio ? new Date(agendamento.dataHoraInicio).toLocaleDateString('pt-BR') : ''}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Estado inicial quando não há anexos e não está no modo digitalização */}
              {anexosExistentes.length === 0 && !modoDigitalizacao && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum documento anexado</h3>
                  <p className="text-gray-500 mb-4">Este agendamento ainda não possui documentos digitalizados.</p>
                  <Button
                    onClick={() => setModoDigitalizacao(true)}
                    className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Digitalizar Documento
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {!modalExpanded && (
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button
                variant="outline"
                disabled={uploading}
                className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
              >
                ❌ Fechar
              </Button>
            </DialogClose>
            
            {modoDigitalizacao && (capturedImage || capturedPdf) && anexosExistentes.length === 0 && (
              <Button
                onClick={handleSave}
                disabled={uploading || !descricao.trim() || !nomeArquivoBase.trim()}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
              >
                {uploading ? (
                  <>
                    ⏳ Salvando...
                  </>
                ) : (
                  <>
                    💾 Salvar Documento
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
      
      {/* Cropper - mantido para compatibilidade com upload de imagem */}
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

      {/* DocumentScanner externo - usado quando não está no modal expandido */}
      {!modalExpanded && (
        <DocumentScannerFixed
          isOpen={showDocumentScanner}
          onClose={() => setShowDocumentScanner(false)}
          onSavePDF={handleDocumentScannerPDF}
        />
      )}
    </Dialog>
  );
};
