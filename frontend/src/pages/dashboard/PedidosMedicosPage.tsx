import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search,
  RefreshCw,
  AlertCircle,
  FileText,
  Paperclip,
  Building2,
  MessageCircle
} from 'lucide-react';
import { ResponsivePagination, FilterButton } from '@/components/layout';
import { AdvancedFilter, type FilterField } from '@/components/ui/advanced-filter';
import { getPacientes, updatePaciente } from '@/services/pacientes';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import type { Servico } from '@/types/Servico';
import { getTodosPedidosMedicos } from '@/services/pacientes-pedidos';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';
import { getAnexos } from '@/services/anexos';
import type { Anexo } from '@/types/Anexo';
import { AppToast } from '@/services/toast';

// Modais da PacientesPage
import CriarPacienteModal from '../pacientes/CriarPacienteModal';
// Removido EditarPacienteModal
import AnexoPacientesModal from '../pacientes/AnexoPacientesModal';
import PedidosMedicosModal from '../pacientes/PedidosMedicosModal';

// Tipos para Pedidos Médicos baseado em Paciente com dataPedidoMedico
export interface PedidoMedico {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteWhatsapp: string;
  convenioNome?: string;
  numeroCarteirinha?: string;
  dataPedidoMedico: string;
  dataVencimento: string;
  diasParaVencer: number;
  status: 'vigente' | 'vencendo' | 'vencido';
  crm?: string;
  cbo?: string;
}

// Função para formatar WhatsApp (suporta 8 e 9 dígitos)
const formatWhatsApp = (whatsapp: string) => {
  if (!whatsapp) return '';
  const numbers = whatsapp.replace(/\D/g, '');
  // Para números com 8 dígitos (12 total com DDI e DDD)
  if (numbers.length === 12) {
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 8)}-${numbers.slice(8)}`;
  }
  // Para números com 9 dígitos (13 total com DDI e DDD)  
  if (numbers.length === 13) {
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
  }
  return whatsapp;
};

// Função para gerar cores de avatar baseada no nome
function getAvatarGradient(nome: string) {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
  ];
  
  const hash = nome.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return gradients[Math.abs(hash) % gradients.length];
}

// Mock de dados para demonstração
const generateMockData = (): PedidoMedico[] => {
  const pacientes = [
    'Maria Silva Santos',
    'João Pedro Oliveira',
    'Ana Carolina Souza',
    'Carlos Eduardo Lima',
    'Fernanda Costa',
    'Roberto Almeida',
    'Patrícia Rodrigues',
    'Diego Mendes',
    'Juliana Pereira',
    'Lucas Ferreira'
  ];

  const convenios = ['Bradesco Saúde', 'Unimed', 'SulAmérica', 'Amil', 'Particular'];

  return Array.from({ length: 25 }, (_, i) => {
    const dataPedido = new Date();
    // Varia as datas de pedido entre 1 e 8 meses atrás
    dataPedido.setMonth(dataPedido.getMonth() - Math.floor(Math.random() * 8) - 1);
    
    const dataVencimento = new Date(dataPedido);
    dataVencimento.setMonth(dataVencimento.getMonth() + 6); // 6 meses de validade
    
    const hoje = new Date();
    const diasParaVencer = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    let status: 'vigente' | 'vencendo' | 'vencido';
    if (diasParaVencer < 0) {
      status = 'vencido';
    } else if (diasParaVencer <= 30) {
      status = 'vencendo';
    } else {
      status = 'vigente';
    }

    return {
      id: `pedido-${i + 1}`,
      pacienteId: `paciente-${i + 1}`,
      pacienteNome: pacientes[i % pacientes.length],
      pacienteWhatsapp: `5511${Math.floor(Math.random() * 900000000) + 100000000}`,
      convenioNome: convenios[Math.floor(Math.random() * convenios.length)],
      numeroCarteirinha: `${Math.floor(Math.random() * 900000) + 100000}`,
      dataPedidoMedico: dataPedido.toISOString().split('T')[0],
      dataVencimento: dataVencimento.toISOString().split('T')[0],
      diasParaVencer,
      status,
      crm: `CRM${Math.floor(Math.random() * 90000) + 10000}`,
      cbo: `2251${Math.floor(Math.random() * 10)}`
    };
  });
};

export const PedidosMedicosPage: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoMedico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [filtrosAplicados, setFiltrosAplicados] = useState<Record<string, string>>({});
  const filterFields: FilterField[] = [
    { key: 'dataInicio', type: 'date', label: 'Data Pedido Início' },
    { key: 'dataFim', type: 'date', label: 'Data Pedido Fim' },
    { key: 'convenioId', type: 'api-select', label: 'Convênio', apiService: getConvenios, placeholder: 'Selecione um convênio...', searchFields: ['nome'] },
    { key: 'pacienteId', type: 'api-select', label: 'Paciente', apiService: getPacientes, placeholder: 'Selecione um paciente...', searchFields: ['nomeCompleto'] },
    { key: 'status', type: 'static-select', label: 'Status', options: [
      { id: 'vigente', nome: 'Vigente' },
      { id: 'vencendo', nome: 'Vencendo' },
      { id: 'vencido', nome: 'Vencido' }
    ], placeholder: 'Selecione o status...' }
  ];

  // Removidos estados/modais de edição de paciente

  // Estados para modal de anexo
  const [showAnexoModal, setShowAnexoModal] = useState(false);
  const [pacienteAnexo, setPacienteAnexo] = useState<Paciente | null>(null);
  const [anexoFiles, setAnexoFiles] = useState<File[]>([]);
  const [anexoDescricao, setAnexoDescricao] = useState('');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [anexoError, setAnexoError] = useState('');
  const [saving, setSaving] = useState(false);
  const [anexoToDelete, setAnexoToDelete] = useState<Anexo | null>(null);
  const [deletingAnexo, setDeletingAnexo] = useState(false);

  // Modal Pedidos Médicos (novo fluxo)
  const [showPedidosModal, setShowPedidosModal] = useState(false);
  const [pacientePedidos, setPacientePedidos] = useState<Paciente | null>(null);

  // Carregar dados reais da API
  useEffect(() => {
    carregarPedidosMedicos();
  }, []);

  const carregarPedidosMedicos = async () => {
    try {
      setCarregandoDados(true);
      setErro(null);
      
      // Buscar todos os pedidos em uma única chamada
      const [pacientesData, conveniosData, servicosData, pedidosApi] = await Promise.all([
        getPacientes(),
        getConvenios(),
        getServicos(),
        getTodosPedidosMedicos()
      ]);

      setConvenios(conveniosData);
      setServicos(servicosData);

      // Montar lista final a partir dos pedidos e relacionamentos retornados
      const pedidosAgregados: PedidoMedico[] = pedidosApi
        .filter(pp => !!pp.dataPedidoMedico)
        .map(pp => {
          const paciente = pacientesData.find(p => p.id === pp.pacienteId);
          const convenio = conveniosData.find(c => c.id === (paciente?.convenioId));

          // Usar data de vencimento do banco (já calculada no backend)
          const dataVencStr = pp.dataVencimentoPedido as string | null;
          // A data já vem como ISO completo (ex: '2026-03-25T00:00:00.000Z')
          const dataVenc = dataVencStr ? new Date(dataVencStr) : null;

          // Criar data de hoje em UTC (zerando horas) para comparação justa
          const hoje = new Date();
          const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));

          const diasParaVencer = dataVenc
            ? Math.ceil((dataVenc.getTime() - hojeUTC.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          // Calcular status
          let status: 'vigente' | 'vencendo' | 'vencido';
          if (!dataVenc) {
            status = 'vigente'; // Sem data de vencimento = não tem controle de vencimento
          } else if (diasParaVencer < 0) {
            status = 'vencido';
          } else if (diasParaVencer <= 30) {
            status = 'vencendo';
          } else {
            status = 'vigente';
          }

          // Formatar data de vencimento (usar valor direto do banco ou '-' se não tiver)
          const dataVencimentoFormatted = dataVencStr || '-';

          return {
            id: pp.id,
            pacienteId: pp.pacienteId,
            pacienteNome: paciente?.nomeCompleto || pp.paciente?.nomeCompleto || 'Paciente',
            pacienteWhatsapp: paciente?.whatsapp || '',
            convenioNome: convenio?.nome || 'Particular',
            numeroCarteirinha: paciente?.numeroCarteirinha || undefined,
            dataPedidoMedico: (pp.dataPedidoMedico as string),
            dataVencimento: dataVencimentoFormatted,
            diasParaVencer: diasParaVencer ?? 0,
            status,
            crm: pp.crm || undefined,
            cbo: pp.cbo || undefined
          } as PedidoMedico;
        });

      setPedidos(pedidosAgregados);
    } catch (error) {
      setErro('Erro ao carregar dados de pedidos médicos. Tente novamente.');
    } finally {
      setCarregandoDados(false);
    }
  };

  // Filtrar dados baseado na busca e filtros
  const pedidosFiltrados = useMemo(() => {
    let resultado = pedidos;

    // Filtrar por busca textual (normaliza acentos e busca por números no WhatsApp)
    if (busca.trim()) {
      const normalize = (str: string) => str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
      const buscaNorm = normalize(busca);
      const buscaDigits = busca.replace(/\D/g, '');

      resultado = resultado.filter(p => {
        const nome = normalize(p.pacienteNome || '');
        const convenioNome = normalize(p.convenioNome || '');
        const carteirinha = (p.numeroCarteirinha || '').toString().trim().toLowerCase();
        const whatsappDigits = (p.pacienteWhatsapp || '').replace(/\D/g, '');

        const matchTexto =
          (buscaNorm && (nome.includes(buscaNorm) || convenioNome.includes(buscaNorm) || carteirinha.includes(buscaNorm)));
        const matchTelefone = buscaDigits ? whatsappDigits.includes(buscaDigits) : false;
        return matchTexto || matchTelefone;
      });
    }

    // Filtros avançados aplicados
    const f = filtrosAplicados;
    if (f.status) resultado = resultado.filter(p => p.status === f.status);
    if (f.convenioId) {
      const conv = convenios.find(c => c.id === f.convenioId);
      if (conv) resultado = resultado.filter(p => p.convenioNome === conv.nome);
    }
    if (f.pacienteId) resultado = resultado.filter(p => p.pacienteId === f.pacienteId);
    if (f.dataInicio) resultado = resultado.filter(p => p.dataPedidoMedico >= f.dataInicio);
    if (f.dataFim) resultado = resultado.filter(p => p.dataPedidoMedico <= f.dataFim);

    // Ordenação: primeiro maiores atrasos (dias negativos mais baixos), depois mais próximos de vencer (dias positivos menores)
    return resultado.slice().sort((a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0));
  }, [pedidos, busca, filtrosAplicados, convenios]);

  // Paginação
  const totalPages = Math.ceil(pedidosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = pedidosFiltrados.slice(startIndex, endIndex);

  // Estatísticas
  const stats = useMemo(() => {
    const vencendo = pedidos.filter(p => p.status === 'vencendo').length;
    const vencidos = pedidos.filter(p => p.status === 'vencido').length;
    const vigentes = pedidos.filter(p => p.status === 'vigente').length;
    const total = pedidos.length;

    return { vencendo, vencidos, vigentes, total };
  }, [pedidos]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Função para buscar paciente completo por ID
  const buscarPacientePorId = async (pacienteId: string): Promise<Paciente | null> => {
    try {
      const pacientes = await getPacientes();
      return pacientes.find(p => p.id === pacienteId) || null;
    } catch (error) {
      return null;
    }
  };

  // Função para aplicar máscara de telefone (igual à do PacienteModal)
  const maskTelefone = (value: string) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 13 dígitos (55 + DD + 9 dígitos)
    const limitedNumbers = numbers.slice(0, 13);
    
    if (limitedNumbers.length <= 2) {
      return `+${limitedNumbers}`;
    } else if (limitedNumbers.length <= 4) {
      return `+${limitedNumbers.slice(0, 2)} (${limitedNumbers.slice(2)}`;
    } else if (limitedNumbers.length <= 8) {
      return `+${limitedNumbers.slice(0, 2)} (${limitedNumbers.slice(2, 4)}) ${limitedNumbers.slice(4)}`;
    } else if (limitedNumbers.length <= 12) {
      // Para números de 8 dígitos
      return `+${limitedNumbers.slice(0, 2)} (${limitedNumbers.slice(2, 4)}) ${limitedNumbers.slice(4, 8)}-${limitedNumbers.slice(8)}`;
    } else {
      // Para números de 9 dígitos
      return `+${limitedNumbers.slice(0, 2)} (${limitedNumbers.slice(2, 4)}) ${limitedNumbers.slice(4, 9)}-${limitedNumbers.slice(9)}`;
    }
  };

  // Funções para abrir modais
  // Removida função abrirModalEdicao

  const abrirModalAnexo = async (pedido: PedidoMedico) => {
    const paciente = await buscarPacientePorId(pedido.pacienteId);
    if (paciente) {
      setPacienteAnexo(paciente);
      setAnexoFiles([]);
      setAnexoDescricao('');
      setAnexoError('');
      setAnexos([]);
      setShowAnexoModal(true);
      // Buscar anexos reais
      try {
        const anexosDb = await getAnexos(paciente.id);
        setAnexos(anexosDb);
      } catch (error) {
        setAnexoError('Erro ao carregar anexos.');
      }
    }
  };

  const abrirModalPedidos = async (pedido: PedidoMedico) => {
    const paciente = await buscarPacientePorId(pedido.pacienteId);
    if (paciente) {
      setPacientePedidos(paciente);
      setShowPedidosModal(true);
    }
  };

  // Funções para fechar modais
  // Removido fecharModal de edição

  const fecharModalAnexo = () => {
    setShowAnexoModal(false);
    setPacienteAnexo(null);
    setAnexoFiles([]);
    setAnexoDescricao('');
    setAnexoError('');
    setAnexos([]);
    setSaving(false);
    setAnexoToDelete(null);
    setDeletingAnexo(false);
  };

  // Removido: não usamos modal de convênio nesta página

  // Handlers para atualizações dos formulários dos modais
  // Removido: sem formulário de edição aqui

  // Removido: sem formulário de convênio nesta página


  const formatarData = (data: string) => {
    if (!data) return '';
    
    try {
      // Se a data já contém horário (formato ISO), usar como está
      let dateToFormat = data;
      
      // Se é apenas a data (YYYY-MM-DD), adicionar horário UTC
      if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        dateToFormat = data + 'T00:00:00Z';
      }
      
      const date = new Date(dateToFormat);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.error('Data inválida:', data);
        return data; // Retorna o valor original se não conseguir formatar
      }
      
      return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (error) {
      console.error('Erro ao formatar data:', data, error);
      return data; // Retorna o valor original em caso de erro
    }
  };

  const getStatusBadge = (pedido: PedidoMedico) => {
    // Se não tem data de vencimento
    if (pedido.dataVencimento === '-') {
      return 'bg-gray-100 text-gray-800';
    }

    if (pedido.status === 'vencido') {
      return 'bg-red-100 text-red-800';
    } else if (pedido.status === 'vencendo') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (pedido: PedidoMedico) => {
    // Se não tem data de vencimento
    if (pedido.dataVencimento === '-') {
      return 'Sem vencimento';
    }

    if (pedido.status === 'vencido') {
      return `Vencido há ${Math.abs(pedido.diasParaVencer)} dias`;
    } else if (pedido.status === 'vencendo') {
      return `${pedido.diasParaVencer} dias para vencer`;
    }
    return 'Vigente';
  };

  // Função para renderizar conteúdo
  function renderContent() {
    if (!pedidos.length) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum pedido médico disponível</p>
        </div>
      );
    }

    return renderTableView();
  }

  function renderTableView() {
    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    Paciente
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">📱</span>
                    WhatsApp
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">🏥</span>
                    Convênio
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">🎫</span>
                    N° Carteirinha
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">📅</span>
                    Data Pedido
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">📆</span>
                    Data Vencimento
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">⏰</span>
                    Status
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">⚙️</span>
                    Ações
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">
                        {busca ? 'Nenhum resultado encontrado' : 'Nenhum pedido encontrado'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                    <td className="px-6 py-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 bg-gradient-to-r ${getAvatarGradient(pedido.pacienteNome)} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                          {pedido.pacienteNome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{pedido.pacienteNome}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <span className="text-sm font-mono bg-green-100 px-2 py-1 rounded text-green-700">
                        {pedido.pacienteWhatsapp ? formatWhatsApp(pedido.pacienteWhatsapp) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <span className="text-sm text-gray-900">{pedido.convenioNome}</span>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <span className="text-sm text-gray-900">
                        {pedido.numeroCarteirinha || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {formatarData(pedido.dataPedidoMedico)}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {formatarData(pedido.dataVencimento)}
                      </span>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <Badge className={getStatusBadge(pedido)}>
                        {getStatusText(pedido)}
                      </Badge>
                    </td>
                    <td className="px-6 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Removido botão Editar Paciente */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirModalAnexo(pedido)}
                          className="h-8 px-2 hover:bg-green-50 hover:border-green-300"
                          title="Gerenciar Anexos"
                        >
                          <Paperclip className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirModalPedidos(pedido)}
                          className="h-8 px-2 hover:bg-purple-50 hover:border-purple-300"
                          title="Pedidos Médicos"
                        >
                          <Building2 className="w-4 h-4 text-purple-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const numeroLimpo = (pedido.pacienteWhatsapp || '').replace(/\D/g, '');
                            if (!numeroLimpo) return;
                            const whatsappUrl = `https://api.whatsapp.com/send/?phone=${numeroLimpo}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                          className="h-8 px-2 hover:bg-green-50 hover:border-green-300"
                          title="Abrir WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // View de cards removida

  // Loading state
  if (carregandoDados) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando pedidos médicos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (erro) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 pt-2 pl-6 pr-6 bg-white border-b border-gray-200">
          <div className="flex justify-between items-center mb-6 px-6 py-4 rounded-lg">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-4xl">📋</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Pedidos Médicos
              </span>
            </h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-2 pl-6 pr-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Erro ao Carregar Dados</h3>
                <p className="text-red-700 mt-1">{erro}</p>
                <Button 
                  onClick={carregarPedidosMedicos} 
                  className="mt-4 bg-red-600 hover:bg-red-700"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header fixo */}
      <div className="flex-shrink-0 pt-2 pl-6 pr-6 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-4xl">📋</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Pedidos Médicos
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por paciente, whatsapp, carteirinha..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <FilterButton
              showFilters={mostrarFiltros}
              onToggleFilters={() => setMostrarFiltros(prev => !prev)}
              activeFiltersCount={Object.values(filtrosAplicados).filter(v => v !== '' && v !== undefined && v !== null).length}
              module="default"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo com scroll independente */}
      <div className="flex-1 overflow-y-auto pt-2 pl-6 pr-6">
        {/* Filtros Avançados */}
        <AdvancedFilter
          fields={filterFields}
          filters={filtros}
          appliedFilters={filtrosAplicados}
          onFilterChange={(k, v) => setFiltros(prev => ({ ...prev, [k]: v }))}
          onApplyFilters={() => setFiltrosAplicados(Object.fromEntries(Object.entries(filtros).filter(([,v]) => v !== '' && v !== undefined && v !== null)))}
          onClearFilters={() => { setFiltros({}); setFiltrosAplicados({}); }}
          isVisible={mostrarFiltros}
          onClose={() => setMostrarFiltros(false)}
          loading={carregandoDados}
        />

        <div className="mt-4">
          {renderContent()}
        </div>
      </div>

      {/* Footer fixo na parte de baixo */}
      {pedidosFiltrados.length > 0 && (
        <div className="flex-shrink-0">
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={pedidosFiltrados.length}
            itemsPerPage={itemsPerPage}
            module="pedidos-medicos"
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      )}

      {/* Removidos modais/fluxos de edição de paciente */}

      <AnexoPacientesModal
        showModal={showAnexoModal}
        paciente={pacienteAnexo}
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

      <PedidosMedicosModal
        showModal={showPedidosModal}
        paciente={pacientePedidos}
        servicos={servicos}
        onClose={() => { setShowPedidosModal(false); setPacientePedidos(null); }}
      />
    </div>
  );
};