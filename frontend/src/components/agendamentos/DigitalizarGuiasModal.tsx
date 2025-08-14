import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Camera, Upload, Download, X, Check } from 'lucide-react';
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
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      console.error('Erro ao buscar nome do usuário:', error);
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
          console.error('Erro ao carregar nomes dos usuários:', error);
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
      console.error('Erro ao carregar anexos:', error);
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
      console.error('Erro ao deletar anexo:', error);
      AppToast.error('Erro ao remover documento', {
        description: 'Não foi possível remover o documento digitalizado.'
      });
    } finally {
      setDeletingAnexo(false);
    }
  };

  // Função para gerar o nome completo do arquivo
  const gerarNomeCompleto = (textoBase: string, usarPadrao: boolean) => {
    if (!textoBase.trim()) return '';
    // Remover caracteres especiais e espaços, manter apenas letras, números e underscore
    const textoLimpo = textoBase.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    return usarPadrao ? `${textoLimpo}_RA_doc1.jpg` : `${textoLimpo}.jpg`;
  };

  // Função para atualizar o nome do arquivo
  const handleNomeArquivoChange = (valor: string) => {
    setNomeArquivoBase(valor);
    setNomeArquivo(gerarNomeCompleto(valor, usarPadraoRA));
  };

  // Função para atualizar quando o checkbox muda
  const handleUsarPadraoRAChange = (checked: boolean) => {
    setUsarPadraoRA(checked);
    setNomeArquivo(gerarNomeCompleto(nomeArquivoBase, checked));
  };

  const startCamera = async () => {
    try {
      // Tornar o container visível antes para garantir que o <video> exista no DOM
      setIsCameraOpen(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Usar câmera traseira preferencialmente
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      // Guardar stream e associar ao <video> quando disponível
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const onLoaded = () => {
          // Tentar iniciar a reprodução assim que os metadados estiverem disponíveis
          try { videoRef.current?.play?.(); } catch { /* noop */ }
          videoRef.current?.removeEventListener('loadedmetadata', onLoaded);
        };
        videoRef.current.addEventListener('loadedmetadata', onLoaded);
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      AppToast.error('Erro ao acessar câmera', {
        description: 'Não foi possível acessar a câmera do dispositivo. Verifique as permissões.'
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      // Desassociar stream para evitar tela preta persistente em alguns navegadores
      // @ts-expect-error - srcObject não é reconhecido em alguns tipos
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    // Garantir que os metadados foram carregados
    if (!video.videoWidth || !video.videoHeight) {
      AppToast.error('Câmera ainda inicializando', {
        description: 'Aguarde um instante e tente capturar novamente.'
      });
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageDataUrl);
      stopCamera();
    }
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
    if (!capturedImage || !agendamento) {
      AppToast.error('Imagem é obrigatória', {
        description: 'Capture uma foto ou selecione um arquivo para continuar.'
      });
      return;
    }

    if (!descricao.trim()) {
      AppToast.error('Descrição é obrigatória', {
        description: 'Informe uma descrição para o documento digitalizado.'
      });
      return;
    }

    if (!nomeArquivoBase.trim()) {
      AppToast.error('Nome do arquivo é obrigatório', {
        description: 'Informe um nome para o arquivo.'
      });
      return;
    }

    setUploading(true);

    try {
      const file = dataURLtoFile(
        capturedImage,
        nomeArquivo // Já vem formatado da função gerarNomeCompleto
      );

      await uploadAnexo({
        file,
        descricao: descricao.trim(),
        entidadeId: agendamento.id,
        modulo: 'agendamentos', // Backend pode ignorar se não usar
        categoria: 'guias', // Backend pode ignorar se não usar
        criadoPor: user?.id || 'sistema' // Usar ID do usuário ao invés do nome
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
      }, 100); // Pequeno delay para garantir que o modal feche primeiro
    } catch (error: unknown) {
      console.error('Erro ao salvar documento:', error);
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

  // Quando o modo câmera abre e já existe um stream, garantir ligação ao <video>
  useEffect(() => {
    if (isCameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      const onLoaded = () => {
        try { videoRef.current?.play?.(); } catch { /* noop */ }
        videoRef.current?.removeEventListener('loadedmetadata', onLoaded);
      };
      videoRef.current.addEventListener('loadedmetadata', onLoaded);
    }
  }, [isCameraOpen]);

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setDescricao('');
    setNomeArquivo('');
    setNomeArquivoBase('');
    setUsarPadraoRA(true); // Reset para default ativo
    setUploading(false);
    setAnexosExistentes([]);
    setLoadingAnexos(true);
    setDeletingAnexo(false);
    setModoDigitalizacao(false);
    setUserNamesCache({}); // Limpar cache de nomes
    onClose();
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setDescricao('');
    setNomeArquivo('');
    setNomeArquivoBase('');
    setUsarPadraoRA(true); // Reset para default ativo
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-purple-50 to-violet-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <Camera className="w-6 h-6 text-purple-600" />
            Digitalizar Guias - {agendamento?.pacienteNome}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {loadingAnexos ? (
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
                            {anexo.url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(anexo.url, '_blank')}
                                className="border-blue-300 text-blue-600 hover:bg-blue-50 flex-1 sm:flex-none"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Visualizar
                              </Button>
                            )}
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
                  {!capturedImage && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Opção de Câmera */}
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 border-2 border-purple-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Camera className="w-5 h-5 text-purple-600" />
                          Scanner com Câmera
                        </h3>
                        
                        {!isCameraOpen ? (
                          <div className="text-center py-6">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Camera className="w-8 h-8 text-purple-600" />
                            </div>
                            <p className="text-gray-600 mb-4">
                              Use a câmera para digitalizar a guia diretamente
                            </p>
                            <Button
                              onClick={startCamera}
                              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Abrir Câmera
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full rounded-lg border-2 border-purple-300"
                              style={{ maxHeight: '300px' }}
                            />
                            <div className="flex gap-2 justify-center">
                              <Button
                                onClick={capturePhoto}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                              >
                                <Camera className="w-4 h-4 mr-2" />
                                Capturar
                              </Button>
                              <Button
                                onClick={stopCamera}
                                variant="outline"
                                className="border-gray-300"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
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

                  {capturedImage && (
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
                            <img
                              src={capturedImage}
                              alt="Documento capturado"
                              className="w-full rounded-lg border-2 border-green-300 max-h-96 object-contain"
                            />
                          </div>
                          
                          <div className="space-y-3">
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
                                💡 Formato: {usarPadraoRA ? '[seu_texto]_RA_doc1.jpg' : '[seu_texto].jpg'}
                              </p>
                            </div>
                            
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
          
          {modoDigitalizacao && capturedImage && anexosExistentes.length === 0 && (
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
      </DialogContent>
    </Dialog>
  );
};