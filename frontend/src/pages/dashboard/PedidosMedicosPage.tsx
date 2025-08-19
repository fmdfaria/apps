import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Users, 
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  AlertCircle,
  FileText,
  CalendarX,
  Edit,
  Paperclip,
  Building2
} from 'lucide-react';
import { 
  PageContainer, 
  ResponsivePagination
} from '@/components/layout';
import { getPacientes, updatePaciente } from '@/services/pacientes';
import { getConvenios } from '@/services/convenios';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';
import { getAnexos } from '@/services/anexos';
import type { Anexo } from '@/types/Anexo';
import { AppToast } from '@/services/toast';

// Modais da PacientesPage
import CriarPacienteModal from '../pacientes/CriarPacienteModal';
import EditarPacienteModal from '../pacientes/EditarPacienteModal';
import AnexoPacientesModal from '../pacientes/AnexoPacientesModal';
import ConvenioModal from '../pacientes/ConvenioModal';

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
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'vencendo' | 'vencidos'>('vencendo');
  const [busca, setBusca] = useState('');
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('tabela');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Estados para modais (reutilizados da PacientesPage)
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Paciente | null>(null);
  const [form, setForm] = useState({
    nomeCompleto: '',
    nomeResponsavel: '',
    cpf: '',
    email: '',
    whatsapp: '',
    dataNascimento: '',
    tipoServico: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

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

  // Estados para modal de convênio
  const [showConvenioModal, setShowConvenioModal] = useState(false);
  const [pacienteConvenio, setPacienteConvenio] = useState<Paciente | null>(null);
  const [formConvenio, setFormConvenio] = useState({
    convenioId: '',
    numeroCarteirinha: '',
    dataPedidoMedico: '',
    crm: '',
    cbo: '',
    cid: '',
  });
  const [formConvenioError, setFormConvenioError] = useState('');
  const [formConvenioLoading, setFormConvenioLoading] = useState(false);

  // Carregar dados reais da API
  useEffect(() => {
    carregarPedidosMedicos();
  }, []);

  const carregarPedidosMedicos = async () => {
    try {
      setCarregandoDados(true);
      setErro(null);
      
      // Buscar pacientes e convenios em paralelo
      const [pacientesData, conveniosData] = await Promise.all([
        getPacientes(),
        getConvenios()
      ]);
      
      setConvenios(conveniosData);
      
      // Filtrar apenas pacientes que têm dataPedidoMedico
      const pacientesComPedido = pacientesData.filter(p => p.dataPedidoMedico);
      
      // Converter pacientes para PedidoMedico
      const pedidosMedicos: PedidoMedico[] = pacientesComPedido.map(paciente => {
        // Verificar formato da data e ajustar se necessário
        let dateToProcess = paciente.dataPedidoMedico!;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateToProcess)) {
          dateToProcess = dateToProcess + 'T00:00:00Z';
        }
        
        const dataPedido = new Date(dateToProcess);
        
        // Verificar se a data é válida
        if (isNaN(dataPedido.getTime())) {
          console.error('Data de pedido médico inválida:', paciente.dataPedidoMedico);
          return null; // Pular este paciente se a data for inválida
        }
        
        const dataVencimento = new Date(dataPedido);
        dataVencimento.setUTCMonth(dataVencimento.getUTCMonth() + 6); // 6 meses de validade
        
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

        // Encontrar nome do convenio
        const convenio = conveniosData.find(c => c.id === paciente.convenioId);
        
        // Formatar data de vencimento mantendo UTC
        const year = dataVencimento.getUTCFullYear();
        const month = String(dataVencimento.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dataVencimento.getUTCDate()).padStart(2, '0');
        const dataVencimentoFormatted = `${year}-${month}-${day}`;
        
        return {
          id: paciente.id,
          pacienteId: paciente.id,
          pacienteNome: paciente.nomeCompleto,
          pacienteWhatsapp: paciente.whatsapp,
          convenioNome: convenio?.nome || 'Particular',
          numeroCarteirinha: paciente.numeroCarteirinha || undefined,
          dataPedidoMedico: paciente.dataPedidoMedico!,
          dataVencimento: dataVencimentoFormatted,
          diasParaVencer,
          status,
          crm: paciente.crm || undefined,
          cbo: paciente.cbo || undefined
        };
      }).filter(pedido => pedido !== null) as PedidoMedico[];
      
      setPedidos(pedidosMedicos);
    } catch (error) {
      setErro('Erro ao carregar dados de pedidos médicos. Tente novamente.');
    } finally {
      setCarregandoDados(false);
    }
  };

  // Filtrar dados baseado na busca e tipo
  const pedidosFiltrados = useMemo(() => {
    let resultado = pedidos;

    // Filtrar por tipo (vencendo ou vencidos)
    const statusFiltro = tipoVisualizacao === 'vencidos' ? 'vencido' : 'vencendo';
    resultado = resultado.filter(pedido => pedido.status === statusFiltro);

    // Filtrar por busca textual
    if (busca.trim()) {
      const buscaLower = busca.toLowerCase();
      resultado = resultado.filter(pedido => 
        pedido.pacienteNome.toLowerCase().includes(buscaLower) ||
        pedido.pacienteWhatsapp.toLowerCase().includes(buscaLower) ||
        pedido.numeroCarteirinha?.toLowerCase().includes(buscaLower) ||
        pedido.convenioNome?.toLowerCase().includes(buscaLower)
      );
    }

    return resultado;
  }, [pedidos, busca, tipoVisualizacao]);

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
  const abrirModalEdicao = async (pedido: PedidoMedico) => {
    const paciente = await buscarPacientePorId(pedido.pacienteId);
    if (paciente) {
      setEditando(paciente);
      setForm({
        nomeCompleto: paciente.nomeCompleto || '',
        nomeResponsavel: paciente.nomeResponsavel || '',
        cpf: paciente.cpf || '',
        email: paciente.email || '',
        whatsapp: maskTelefone(paciente.whatsapp || ''), // Aplicar máscara
        dataNascimento: paciente.dataNascimento ? paciente.dataNascimento.substring(0, 10) : '',
        tipoServico: paciente.tipoServico || 'Particular',
      });
      setFormError('');
      setShowModal(true);
    }
  };

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

  const abrirModalConvenio = async (pedido: PedidoMedico) => {
    const paciente = await buscarPacientePorId(pedido.pacienteId);
    if (paciente) {
      setPacienteConvenio(paciente);
      
      // Debug: Verificar os dados recebidos
      console.log('🔍 DEBUG ConvenioModal:', {
        pedido: {
          dataPedidoMedico: pedido.dataPedidoMedico,
          pacienteNome: pedido.pacienteNome
        },
        paciente: {
          dataPedidoMedico: paciente.dataPedidoMedico,
          nomeCompleto: paciente.nomeCompleto
        }
      });
      
      // Função para garantir formato YYYY-MM-DD para input type="date"
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        try {
          // Se a string já está no formato YYYY-MM-DD, retorna como está
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
          }
          
          // Se a data já contém horário (formato ISO), usar como está
          let dateToFormat = dateString;
          
          // Se é apenas a data (YYYY-MM-DD), adicionar horário UTC
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            dateToFormat = dateString + 'T00:00:00Z';
          }
          
          const date = new Date(dateToFormat);
          
          // Verificar se a data é válida
          if (isNaN(date.getTime())) {
            console.error('❌ Data inválida para input:', dateString);
            return '';
          }
          
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const formatted = `${year}-${month}-${day}`;
          console.log('📅 Formatação de data:', { original: dateString, formatted });
          return formatted;
        } catch (error) {
          console.error('❌ Erro ao formatar data:', dateString, error);
          return '';
        }
      };
      
      const dataFormatada = formatDateForInput(pedido.dataPedidoMedico || paciente.dataPedidoMedico || '');
      console.log('✅ Data final para o modal:', dataFormatada);
      
      setFormConvenio({
        convenioId: paciente.convenioId || '',
        numeroCarteirinha: paciente.numeroCarteirinha || '',
        dataPedidoMedico: dataFormatada,
        crm: paciente.crm || '',
        cbo: paciente.cbo || '',
        cid: paciente.cid || '',
      });
      setFormConvenioError('');
      setShowConvenioModal(true);
    }
  };

  // Funções para fechar modais
  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({ nomeCompleto: '', nomeResponsavel: '', cpf: '', email: '', whatsapp: '', dataNascimento: '', tipoServico: '' });
    setFormError('');
  };

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

  const fecharModalConvenio = () => {
    setShowConvenioModal(false);
    setPacienteConvenio(null);
    setFormConvenio({
      convenioId: '',
      numeroCarteirinha: '',
      dataPedidoMedico: '',
      crm: '',
      cbo: '',
      cid: '',
    });
    setFormConvenioError('');
  };

  // Handlers para atualizações dos formulários dos modais
  const handleFormChange = (updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleFormConvenioChange = (updates: Partial<typeof formConvenio>) => {
    setFormConvenio(prev => ({ ...prev, ...updates }));
  };


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
    if (pedido.status === 'vencido') {
      return 'bg-red-100 text-red-800';
    } else if (pedido.status === 'vencendo') {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (pedido: PedidoMedico) => {
    if (pedido.status === 'vencido') {
      return `Vencido há ${Math.abs(pedido.diasParaVencer)} dias`;
    } else if (pedido.status === 'vencendo') {
      return `${pedido.diasParaVencer} dias para vencer`;
    }
    return 'Vigente';
  };

  // Função para renderizar conteúdo baseado na visualização
  function renderContent() {
    if (!pedidos.length) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum pedido médico disponível</p>
        </div>
      );
    }

    return (
      <>
        {visualizacao === 'tabela' ? renderTableView() : renderCardView()}
      </>
    );
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
                        {busca 
                          ? 'Nenhum resultado encontrado' 
                          : `Nenhum pedido ${tipoVisualizacao === 'vencendo' ? 'vencendo' : 'vencido'} encontrado`
                        }
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirModalEdicao(pedido)}
                          className="h-8 px-2 hover:bg-blue-50 hover:border-blue-300"
                          title="Editar paciente"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
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
                          onClick={() => abrirModalConvenio(pedido)}
                          className="h-8 px-2 hover:bg-purple-50 hover:border-purple-300"
                          title="Dados do Convênio"
                        >
                          <Building2 className="w-4 h-4 text-purple-600" />
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

  function renderCardView() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentItems.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">
                {busca 
                  ? 'Nenhum resultado encontrado' 
                  : `Nenhum pedido ${tipoVisualizacao === 'vencendo' ? 'vencendo' : 'vencido'} encontrado`
                }
              </p>
            </div>
          </div>
        ) : (
          currentItems.map((pedido) => (
            <Card key={pedido.id} className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 bg-gradient-to-r ${getAvatarGradient(pedido.pacienteNome)} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {pedido.pacienteNome.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{pedido.pacienteNome}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* WhatsApp */}
                <div>
                  <span className="text-xs font-medium text-gray-500">WhatsApp</span>
                  <p className="text-sm font-mono bg-green-100 px-2 py-1 rounded text-green-700 inline-block">
                    {pedido.pacienteWhatsapp ? formatWhatsApp(pedido.pacienteWhatsapp) : '-'}
                  </p>
                </div>

                {/* Convênio e Carteirinha na mesma linha */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Convênio</span>
                    <p className="text-sm font-medium text-gray-900">{pedido.convenioNome}</p>
                  </div>
                  {pedido.numeroCarteirinha && (
                    <div>
                      <span className="text-xs font-medium text-gray-500">Carteirinha</span>
                      <p className="text-sm text-gray-700">{pedido.numeroCarteirinha}</p>
                    </div>
                  )}
                </div>

                {/* Datas na mesma linha */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Data do Pedido</span>
                    <p className="text-sm font-medium text-gray-900">{formatarData(pedido.dataPedidoMedico)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500">Data de Vencimento</span>
                    <p className="text-sm font-medium text-gray-900">{formatarData(pedido.dataVencimento)}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex justify-center">
                  <Badge className={getStatusBadge(pedido)}>
                    {getStatusText(pedido)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

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
            <p className="text-gray-600 mt-2">
              Acompanhe a validade dos pedidos médicos dos seus pacientes
            </p>
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
            
            {/* Toggle de visualização */}
            <div className="flex border rounded-lg p-1 bg-gray-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisualizacao('tabela')}
                className={`h-7 px-3 ${visualizacao === 'tabela' ? 'bg-white shadow-sm' : ''}`}
              >
                <List className="w-4 h-4 mr-1" />
                Tabela
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisualizacao('cards')}
                className={`h-7 px-3 ${visualizacao === 'cards' ? 'bg-white shadow-sm' : ''}`}
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Cards
              </Button>
            </div>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Pedidos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500 opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pedidos Vigentes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.vigentes}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-500 opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vencendo em 30 dias</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.vencendo}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500 opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pedidos Vencidos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.vencidos}</p>
                </div>
                <CalendarX className="w-8 h-8 text-red-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Conteúdo com scroll independente */}
      <div className="flex-1 overflow-y-auto pt-2 pl-6 pr-6">
        {/* Toggle grande para separar Vencendo | Vencidos */}
        <div className="mb-6">
          <Tabs 
            value={tipoVisualizacao} 
            onValueChange={(value) => setTipoVisualizacao(value as 'vencendo' | 'vencidos')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger 
                value="vencendo" 
                className="flex items-center gap-2 transition-colors duration-200 text-base font-medium data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700 data-[state=active]:border-yellow-300"
              >
                <AlertTriangle className="w-5 h-5" />
                Vencendo (30 dias)
                <Badge variant="secondary" className="ml-1">
                  {stats.vencendo}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="vencidos" 
                className="flex items-center gap-2 transition-colors duration-200 text-base font-medium data-[state=active]:bg-red-100 data-[state=active]:text-red-700 data-[state=active]:border-red-300"
              >
                <CalendarX className="w-5 h-5" />
                Vencidos
                <Badge variant="secondary" className="ml-1">
                  {stats.vencidos}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vencendo" className="mt-6">
              {renderContent()}
            </TabsContent>

            <TabsContent value="vencidos" className="mt-6">
              {renderContent()}
            </TabsContent>
          </Tabs>
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

      {/* Modais reutilizados da PacientesPage */}
      <EditarPacienteModal
        showModal={showModal}
        editando={editando}
        form={form}
        formError={formError}
        formLoading={formLoading}
        onClose={fecharModal}
        onFormChange={handleFormChange}
        onSubmit={async (e) => {
          e.preventDefault();
          
          // Validação - Nome Completo, WhatsApp e Tipo de Serviço são obrigatórios
          if (!form.nomeCompleto.trim() || form.nomeCompleto.trim().length < 2) {
            AppToast.error('Erro de Validação', {
              description: 'O Nome Completo deve ter pelo menos 2 caracteres.'
            });
            return;
          }
          
          if (!form.whatsapp.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'O WhatsApp é obrigatório.'
            });
            return;
          }
          
          if (!form.tipoServico.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'O Tipo de Serviço é obrigatório.'
            });
            return;
          }
          
          // Validar formato do WhatsApp (8 ou 9 dígitos)
          const telefone8Digitos = /^\+55 \(\d{2}\) \d{4}-\d{4}$/.test(form.whatsapp.trim());
          const telefone9Digitos = /^\+55 \(\d{2}\) \d{5}-\d{4}$/.test(form.whatsapp.trim());
          if (!telefone8Digitos && !telefone9Digitos) {
            AppToast.error('Erro de Validação', {
              description: 'WhatsApp inválido. Exemplo: +55 (12) 9999-9999 ou +55 (12) 99999-9999'
            });
            return;
          }
          
          // Validar formato do CPF apenas se estiver preenchido
          if (form.cpf.trim() && form.cpf.length < 14) {
            AppToast.error('Erro de Validação', {
              description: 'CPF inválido. Exemplo: xxx.xxx.xxx-xx.'
            });
            return;
          }
          
          // Validar formato do email apenas se estiver preenchido
          if (form.email.trim() && !form.email.includes('@')) {
            AppToast.error('Erro de Validação', {
              description: 'E-mail inválido. Exemplo: nome@email.com'
            });
            return;
          }

          setFormLoading(true);
          setFormError('');
          
          // Remover formatação do WhatsApp para salvar apenas números
          const whatsappNumeros = form.whatsapp.replace(/\D/g, '');
          
          const pacientePayload: any = {
            nomeCompleto: form.nomeCompleto,
            nomeResponsavel: form.nomeResponsavel.trim() || null,
            cpf: form.cpf.trim() || null,
            email: form.email.trim() || null,
            whatsapp: whatsappNumeros,
            dataNascimento: form.dataNascimento || null,
            tipoServico: form.tipoServico,
          };

          try {
            if (editando) {
              await updatePaciente(editando.id, pacientePayload);
              AppToast.updated('Paciente', 'Os dados do paciente foram atualizados com sucesso.');
              // Recarregar dados da página para refletir as alterações
              carregarPedidosMedicos();
            }
            fecharModal();
          } catch (err: any) {
            let msg = 'Erro ao salvar paciente.';
            if (err?.response?.data?.message) msg = err.response.data.message;
            else if (err?.response?.data?.error) msg = err.response.data.error;
            setFormError(msg);
          } finally {
            setFormLoading(false);
          }
        }}
        convenios={convenios}
      />

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

      <ConvenioModal
        showModal={showConvenioModal}
        paciente={pacienteConvenio}
        form={formConvenio}
        formError={formConvenioError}
        formLoading={formConvenioLoading}
        convenios={convenios}
        onClose={fecharModalConvenio}
        onFormChange={handleFormConvenioChange}
        onSubmit={async (e) => {
          e.preventDefault();
          
          // Validações obrigatórias
          if (!formConvenio.convenioId.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'Convênio é obrigatório.'
            });
            return;
          }
          
          if (!formConvenio.numeroCarteirinha.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'Número da Carteirinha é obrigatório.'
            });
            return;
          }
          
          if (!formConvenio.dataPedidoMedico.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'Data do Pedido Médico é obrigatória.'
            });
            return;
          }
          
          if (!formConvenio.crm.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'CRM é obrigatório.'
            });
            return;
          }
          
          if (!formConvenio.cbo.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'CBO é obrigatório.'
            });
            return;
          }
          
          if (!formConvenio.cid.trim()) {
            AppToast.error('Erro de Validação', {
              description: 'CID é obrigatório.'
            });
            return;
          }

          setFormConvenioLoading(true);
          setFormConvenioError('');

          try {
            if (pacienteConvenio) {
              // Preparar payload com dados do convênio
              const pacientePayload: any = {
                // Manter todos os dados existentes do paciente
                nomeCompleto: pacienteConvenio.nomeCompleto,
                nomeResponsavel: pacienteConvenio.nomeResponsavel,
                cpf: pacienteConvenio.cpf,
                email: pacienteConvenio.email,
                whatsapp: pacienteConvenio.whatsapp,
                dataNascimento: pacienteConvenio.dataNascimento,
                tipoServico: pacienteConvenio.tipoServico,
                // Atualizar dados do convênio
                convenioId: formConvenio.convenioId,
                numeroCarteirinha: formConvenio.numeroCarteirinha.trim(),
                dataPedidoMedico: formConvenio.dataPedidoMedico,
                crm: formConvenio.crm.trim(),
                cbo: formConvenio.cbo.trim(),
                cid: formConvenio.cid.trim(),
              };
              
              await updatePaciente(pacienteConvenio.id, pacientePayload);
              AppToast.updated('Dados do Convênio', 'Os dados do convênio foram atualizados com sucesso.');
              // Recarregar dados da página para refletir as alterações
              carregarPedidosMedicos();
            }
            fecharModalConvenio();
          } catch (err: any) {
            let msg = 'Erro ao salvar dados do convênio.';
            if (err?.response?.data?.message) msg = err.response.data.message;
            else if (err?.response?.data?.error) msg = err.response.data.error;
            setFormConvenioError(msg);
          } finally {
            setFormConvenioLoading(false);
          }
        }}
      />
    </div>
  );
};