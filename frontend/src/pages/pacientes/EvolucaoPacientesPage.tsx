import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowLeft, User, FileText, Phone, Building2, IdCard } from 'lucide-react';
import { getEvolucoes } from '@/services/evolucoes';
import { getPacientes } from '@/services/pacientes';
import { getConvenios } from '@/services/convenios';
import type { EvolucaoPaciente } from '@/types/EvolucaoPaciente';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';

export const EvolucaoPacientesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [evolucoes, setEvolucoes] = useState<EvolucaoPaciente[]>([]);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);

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

  const convenioNome = useMemo(() => {
    if (!paciente?.convenioId) return undefined;
    return convenios.find(c => c.id === paciente.convenioId)?.nome;
  }, [paciente?.convenioId, convenios]);

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
          <Button variant="outline" onClick={() => navigate('/pacientes')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
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
              <div key={group.key} className="space-y-4">
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
                  <div className="space-y-4">
                    {group.items.map((ev, idx) => (
                      <div key={ev.id || idx} className="relative pl-12 md:pl-16">
                        {/* Marcador do item */}
                        <div className="absolute left-4 top-3 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow" />
                        {/* Conteúdo */}
                        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>{formatarData(ev.dataEvolucao as any)}</span>
                              </div>
                              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">{ev.objetivoSessao || 'Evolução'}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">Descrição</span>
                            </div>
                            <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">
                              {ev.descricaoEvolucao}
                            </p>
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
    </div>
  );
};

export default EvolucaoPacientesPage;


