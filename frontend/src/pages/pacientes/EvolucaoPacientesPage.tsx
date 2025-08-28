import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowLeft, User, FileText, Phone, Building2, IdCard, Paperclip, UserCheck, Stethoscope, Edit, Trash2 } from 'lucide-react';
import { getEvolucoes, deleteEvolucao, updateEvolucao } from '@/services/evolucoes';
import { getPacientes } from '@/services/pacientes';
import { getConvenios } from '@/services/convenios';
import { useAuth } from '@/hooks/useAuth';
import { AppToast } from '@/services/toast';
import type { EvolucaoPaciente } from '@/types/EvolucaoPaciente';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';
import AnexoEvolucoesPacientesModal from './AnexoEvolucoesPacientesModal';
import EvolucaoPacientesModal from './EvolucaoPacientesModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getAnexos } from '@/services/anexos';
import type { Anexo } from '@/types/Anexo';

export const EvolucaoPacientesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [evolucoes, setEvolucoes] = useState<EvolucaoPaciente[]>([]);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  // Estado do modal de anexos
  const [showAnexoModal, setShowAnexoModal] = useState(false);
  const [anexoFiles, setAnexoFiles] = useState<File[]>([]);
  const [anexoDescricao, setAnexoDescricao] = useState('');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [anexoError, setAnexoError] = useState('');
  const [anexoToDelete, setAnexoToDelete] = useState<Anexo | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingAnexo, setDeletingAnexo] = useState(false);
  
  // Estados para o modal de evolução
  const [showEvolucaoModal, setShowEvolucaoModal] = useState(false);
  const [evolucaoParaEditar, setEvolucaoParaEditar] = useState<EvolucaoPaciente | null>(null);
  
  // Estados para o modal de confirmação de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [evolucaoParaExcluir, setEvolucaoParaExcluir] = useState<EvolucaoPaciente | null>(null);
  const [deletingEvolucao, setDeletingEvolucao] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setErro(null);
        const [evols, pacientes, conveniosData] = await Promise.all([
          getEvolucoes({ pacienteId: id }),
          getPacientes(),
          getConvenios()
        ]);
        setEvolucoes(evols || []);
        setPaciente(pacientes.find((p) => p.id === id) || null);
        setConvenios(conveniosData || []);
      } catch (e) {
        setErro('Erro ao carregar evoluções do paciente.');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [id]);

  const evolucoesOrdenadas = useMemo(() => {
    return [...evolucoes].sort((a, b) => {
      const da = new Date(a.dataEvolucao as any).getTime();
      const db = new Date(b.dataEvolucao as any).getTime();
      return db - da; // mais recente primeiro
    });
  }, [evolucoes]);

  // Agrupar por mês/ano
  const monthGroups = useMemo(() => {
    const map = new Map<string, { key: string; date: Date; label: string; items: EvolucaoPaciente[] }>();
    evolucoesOrdenadas.forEach((ev) => {
      const d = new Date(ev.dataEvolucao as any);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth(); // 0-11
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        const refDate = new Date(Date.UTC(y, m, 1));
        const monthName = refDate.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
        const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${y}`;
        map.set(key, { key, date: refDate, label, items: [] });
      }
      map.get(key)!.items.push(ev);
    });
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [evolucoesOrdenadas]);

  // Controlar meses abertos (por padrão apenas o mês atual)
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return `${y}-${String(m + 1).padStart(2, '0')}`;
  }, []);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  useEffect(() => {
    setOpenMonths(new Set([currentMonthKey]));
  }, [currentMonthKey, id]);
  const toggleMonth = (key: string) => {
    setOpenMonths(prev => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key); else s.add(key);
      return s;
    });
  };

  const formatarData = (iso: string | Date) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const formatWhatsApp = (whatsapp?: string) => {
    if (!whatsapp) return '';
    const numbers = whatsapp.replace(/\D/g, '');
    if (numbers.length === 12) {
      return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 8)}-${numbers.slice(8)}`;
    }
    if (numbers.length === 13) {
      return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
    }
    return whatsapp;
  };

  // Funções de permissão
  const canEditEvolucao = (evolucao: EvolucaoPaciente) => {
    if (!user) return false;
    
    // ADMIN pode editar qualquer evolução
    if (user.roles?.includes('ADMIN')) return true;
    
    // PROFISSIONAL pode editar apenas suas próprias evoluções
    if (user.roles?.includes('PROFISSIONAL') && user.profissionalId) {
      return evolucao.profissionalId === user.profissionalId;
    }
    
    return false;
  };

  const canDeleteEvolucao = (evolucao: EvolucaoPaciente) => {
    if (!user) return false;
    
    // ADMIN pode excluir qualquer evolução
    if (user.roles?.includes('ADMIN')) return true;
    
    // PROFISSIONAL pode excluir apenas suas próprias evoluções
    if (user.roles?.includes('PROFISSIONAL') && user.profissionalId) {
      return evolucao.profissionalId === user.profissionalId;
    }
    
    return false;
  };

  const convenioNome = useMemo(() => {
    if (!paciente?.convenioId) return undefined;
    return convenios.find(c => c.id === paciente.convenioId)?.nome;
  }, [paciente?.convenioId, convenios]);

  const abrirModalAnexos = async () => {
    if (!paciente) return;
    setShowAnexoModal(true);
    setAnexoFiles([]);
    setAnexoDescricao('');
    setAnexoError('');
    setAnexos([]);
    try {
      const anexosDb = await getAnexos(paciente.id, 'evolucoes');
      setAnexos(Array.isArray(anexosDb) ? anexosDb.filter((a: any) => a.bucket === 'evolucoes') : []);
    } catch {
      setAnexos([]);
    }
  };

  const fecharModalAnexo = () => {
    setShowAnexoModal(false);
    setAnexoFiles([]);
    setAnexoDescricao('');
    setAnexoError('');
    setAnexos([]);
    setAnexoToDelete(null);
    setSaving(false);
    setDeletingAnexo(false);
  };

  const abrirModalEvolucao = () => {
    setEvolucaoParaEditar(null);
    setShowEvolucaoModal(true);
  };

  const fecharModalEvolucao = () => {
    setShowEvolucaoModal(false);
    setEvolucaoParaEditar(null);
  };

  const handleSuccessEvolucao = () => {
    // Recarregar evoluções após sucesso
    if (id) {
      getEvolucoes({ pacienteId: id }).then((evols) => {
        setEvolucoes(evols || []);
      });
    }
    fecharModalEvolucao();
  };

  const handleEditEvolucao = (evolucao: EvolucaoPaciente) => {
    setEvolucaoParaEditar(evolucao);
    setShowEvolucaoModal(true);
  };

  const handleDeleteEvolucao = (evolucao: EvolucaoPaciente) => {
    setEvolucaoParaExcluir(evolucao);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!evolucaoParaExcluir) return;

    try {
      setDeletingEvolucao(true);
      await deleteEvolucao(evolucaoParaExcluir.id);
      AppToast.success('Evolução excluída com sucesso!');
      
      // Recarregar evoluções
      if (id) {
        const evols = await getEvolucoes({ pacienteId: id });
        setEvolucoes(evols || []);
      }
      
      setShowDeleteModal(false);
      setEvolucaoParaExcluir(null);
    } catch (error) {
      console.error('Erro ao excluir evolução:', error);
      AppToast.error('Erro ao excluir evolução');
    } finally {
      setDeletingEvolucao(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setEvolucaoParaExcluir(null);
    setDeletingEvolucao(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Carregando evoluções...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header Moderno */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Evoluções do Paciente
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="default" onClick={abrirModalEvolucao} className="gap-2 bg-green-600 hover:bg-green-700">
              <FileText className="w-4 h-4" /> Criar Evolução
            </Button>
            <Button variant="default" onClick={abrirModalAnexos} className="gap-2">
              <Paperclip className="w-4 h-4" /> Anexar Arquivos
            </Button>
            <Button variant="outline" onClick={() => navigate('/pacientes')} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-700" />
              <span className="text-gray-500">Nome:</span>
              <span className="font-medium truncate">{paciente?.nomeCompleto || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-green-600" />
              <span className="text-gray-500">Whatsapp:</span>
              <span className="font-mono bg-green-50 px-2 py-0.5 rounded text-green-700">{formatWhatsApp(paciente?.whatsapp || '') || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-gray-500">Convênio:</span>
              <span className="font-medium">{convenioNome || 'Particular'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <IdCard className="w-4 h-4 text-indigo-600" />
              <span className="text-gray-500">Nº Carteirinha:</span>
              <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded text-indigo-700">{paciente?.numeroCarteirinha || '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline alinhada à direita com linha à esquerda */}
      <div className="relative max-w-5xl mx-auto">
        {/* Linha vertical fixa à esquerda */}
        <div className="absolute left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 to-purple-200 rounded" />

        <div className="space-y-6">
          {evolucoesOrdenadas.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Nenhuma evolução registrada para este paciente.</p>
            </div>
          ) : (
            monthGroups.map((group) => (
              <div key={group.key} className="space-y-6">
                {/* Cabeçalho do mês */}
                <div className="relative pl-12 md:pl-16 cursor-pointer" onClick={() => toggleMonth(group.key)}>
                  {/* Marcador do mês */}
                  <div className="absolute left-4 top-1.5 w-5 h-5 bg-white border-2 border-purple-500 rounded-full shadow flex items-center justify-center">
                    <div className={`w-2 h-2 rounded-full ${openMonths.has(group.key) ? 'bg-purple-500' : 'bg-gray-300'}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 select-none">
                    {group.label}
                  </h3>
                </div>

                {/* Itens do mês (colapsáveis) */}
                {openMonths.has(group.key) && (
                  <div className="space-y-6">
                    {group.items.map((ev, idx) => (
                      <div key={ev.id || idx} className="relative pl-12 md:pl-16">
                        {/* Marcador do item otimizado */}
                        <div className="absolute left-4 top-4 w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        {/* Card otimizado */}
                        <Card className="group hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-br from-white via-white to-blue-50/30">
                          <CardContent className="p-5 space-y-4">
                            {/* Header com data */}
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium">{formatarData(ev.dataEvolucao as any)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Informações do profissional */}
                            {ev.profissionalNome && (
                              <div className="flex items-center gap-2 text-sm bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                                <UserCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-gray-600">Profissional:</span>
                                <span className="font-semibold text-green-700">{ev.profissionalNome}</span>
                              </div>
                            )}

                            {/* Seção de descrição */}
                            <div className="space-y-2">
                              <Badge 
                                variant="outline" 
                                className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-800 font-medium px-3 py-1"
                              >
                                <Stethoscope className="w-3 h-3 mr-1" />
                                {ev.objetivoSessao || 'Evolução'}
                              </Badge>
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">
                                  {ev.descricaoEvolucao}
                                </p>
                              </div>
                            </div>

                            {/* Footer com botões de ação */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                              {canEditEvolucao(ev) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditEvolucao(ev)}
                                  className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4 mr-1" />
                                  Editar
                                </Button>
                              )}
                              {canDeleteEvolucao(ev) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEvolucao(ev)}
                                  className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Excluir
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Anexos de Evoluções */}
      <AnexoEvolucoesPacientesModal
        showModal={showAnexoModal}
        paciente={paciente}
        anexoFiles={anexoFiles}
        anexoDescricao={anexoDescricao}
        anexos={anexos}
        anexoError={anexoError}
        saving={saving}
        anexoToDelete={anexoToDelete}
        deletingAnexo={deletingAnexo}
        onClose={fecharModalAnexo}
        onAnexoFilesChange={setAnexoFiles}
        onAnexoDescricaoChange={setAnexoDescricao}
        onAnexosChange={setAnexos}
        onAnexoErrorChange={setAnexoError}
        onSavingChange={setSaving}
        onAnexoToDeleteChange={setAnexoToDelete}
        onDeletingAnexoChange={setDeletingAnexo}
      />

      {/* Modal de Evolução */}
      <EvolucaoPacientesModal
        open={showEvolucaoModal}
        pacientes={paciente ? [paciente] : []} // Lista com o paciente atual
        agendamentoInicial={null} // Null para evolução standalone
        evolucaoParaEditar={evolucaoParaEditar}
        onClose={fecharModalEvolucao}
        onSuccess={handleSuccessEvolucao}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        entityName={evolucaoParaExcluir ? `Evolução de ${formatarData(evolucaoParaExcluir.dataEvolucao)}` : ''}
        entityType="evolução"
        isLoading={deletingEvolucao}
        loadingText="Excluindo evolução..."
        confirmText="Excluir Evolução"
      />
    </div>
  );
};

export default EvolucaoPacientesPage;


