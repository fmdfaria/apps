export const routes = {
  authLogin: '/(auth)/login',
  authFirstLogin: '/(auth)/first-login',
  tabsRoot: '/(tabs)',
  tabsAtendimento: '/(tabs)/atendimento',
  tabsAgendamentos: '/(tabs)/agendamentos',
  tabsAgendamentosFiltered: (params: { status?: string }) =>
    `/(tabs)/agendamentos${params.status ? `?status=${encodeURIComponent(params.status)}` : ''}`,
  tabsPacientes: '/(tabs)/customers',
  tabsAgenda: '/(tabs)/calendar',
  tabsRelease: '/(tabs)/release',
  tabsReleaseParticular: '/(tabs)/release-particular',
  agendamentosNew: '/agendamentos/new',
  tabsWaitlist: '/(tabs)/waitlist',
  modalQuickActions: '/modals/quick-actions',
  waitlist: '/waitlist',
  release: '/release',
  releaseParticular: '/release-particular',
  tasks: '/tasks/index',
  finance: '/finance/index',
  notifications: '/notifications/index',
  settings: '/settings',
  agendaActions: (params: {
    agendamentoId: string;
    pacienteId: string;
    profissionalId: string;
    recursoId: string;
    convenioId: string;
    servicoId: string;
    pacienteNome?: string;
    profissionalNome?: string;
    servicoNome?: string;
    dataHoraInicio?: string;
    dataHoraFim?: string;
    tipoAtendimento?: string;
    status?: string;
  }) =>
    `/agenda/actions?agendamentoId=${encodeURIComponent(params.agendamentoId)}&pacienteId=${encodeURIComponent(params.pacienteId)}&profissionalId=${encodeURIComponent(params.profissionalId)}&recursoId=${encodeURIComponent(params.recursoId)}&convenioId=${encodeURIComponent(params.convenioId)}&servicoId=${encodeURIComponent(params.servicoId)}${
      params.pacienteNome ? `&pacienteNome=${encodeURIComponent(params.pacienteNome)}` : ''
    }${params.profissionalNome ? `&profissionalNome=${encodeURIComponent(params.profissionalNome)}` : ''}${
      params.servicoNome ? `&servicoNome=${encodeURIComponent(params.servicoNome)}` : ''
    }${params.dataHoraInicio ? `&dataHoraInicio=${encodeURIComponent(params.dataHoraInicio)}` : ''}${
      params.dataHoraFim ? `&dataHoraFim=${encodeURIComponent(params.dataHoraFim)}` : ''
    }${params.tipoAtendimento ? `&tipoAtendimento=${encodeURIComponent(params.tipoAtendimento)}` : ''}${
      params.status ? `&status=${encodeURIComponent(params.status)}` : ''
    }`,
  customerDetails: (id: string) => `/customers/${id}`,
  customerActions: (id: string, nome?: string) =>
    `/customers/actions?id=${encodeURIComponent(id)}${nome ? `&nome=${encodeURIComponent(nome)}` : ''}`,
  customerEdit: (id: string) => `/customers/edit?id=${encodeURIComponent(id)}`,
  customerAttachments: (id: string, nome?: string) =>
    `/customers/attachments?id=${encodeURIComponent(id)}${nome ? `&nome=${encodeURIComponent(nome)}` : ''}`,
  customerOrders: (id: string, nome?: string) =>
    `/customers/orders?id=${encodeURIComponent(id)}${nome ? `&nome=${encodeURIComponent(nome)}` : ''}`,
  customerEvolutions: (
    id: string,
    nome?: string,
    context?: {
      agendamentoId?: string;
      profissionalId?: string;
      dataCodLiberacao?: string;
    },
  ) =>
    `/customers/evolutions?id=${encodeURIComponent(id)}${nome ? `&nome=${encodeURIComponent(nome)}` : ''}${
      context?.agendamentoId ? `&agendamentoId=${encodeURIComponent(context.agendamentoId)}` : ''
    }${context?.profissionalId ? `&profissionalId=${encodeURIComponent(context.profissionalId)}` : ''}${
      context?.dataCodLiberacao ? `&dataCodLiberacao=${encodeURIComponent(context.dataCodLiberacao)}` : ''
    }`,
  atendimentoActions: (params: {
    agendamentoId: string;
    pacienteId: string;
    pacienteNome?: string;
    profissionalId?: string;
    profissionalNome?: string;
    convenioId?: string;
    tipoAtendimento?: string;
    urlMeet?: string;
    dataCodLiberacao?: string;
    dataHoraInicio?: string;
    servicoNome?: string;
    status?: string;
    hasEvolucao?: boolean;
    compareceu?: boolean | null;
    assinaturaPaciente?: boolean | null;
    assinaturaProfissional?: boolean | null;
    motivoReprovacao?: string | null;
  }) =>
    `/agendamentos/actions?agendamentoId=${encodeURIComponent(params.agendamentoId)}&pacienteId=${encodeURIComponent(params.pacienteId)}${
      params.pacienteNome ? `&pacienteNome=${encodeURIComponent(params.pacienteNome)}` : ''
    }${params.profissionalId ? `&profissionalId=${encodeURIComponent(params.profissionalId)}` : ''}${
      params.profissionalNome ? `&profissionalNome=${encodeURIComponent(params.profissionalNome)}` : ''
    }${params.convenioId ? `&convenioId=${encodeURIComponent(params.convenioId)}` : ''}${
      params.tipoAtendimento ? `&tipoAtendimento=${encodeURIComponent(params.tipoAtendimento)}` : ''
    }${params.urlMeet ? `&urlMeet=${encodeURIComponent(params.urlMeet)}` : ''}${
      params.dataCodLiberacao ? `&dataCodLiberacao=${encodeURIComponent(params.dataCodLiberacao)}` : ''
    }${params.dataHoraInicio ? `&dataHoraInicio=${encodeURIComponent(params.dataHoraInicio)}` : ''}${
      params.servicoNome ? `&servicoNome=${encodeURIComponent(params.servicoNome)}` : ''
    }${params.status ? `&status=${encodeURIComponent(params.status)}` : ''}${
      params.hasEvolucao !== undefined ? `&hasEvolucao=${params.hasEvolucao ? 'true' : 'false'}` : ''
    }${params.compareceu === true ? '&compareceu=true' : params.compareceu === false ? '&compareceu=false' : ''}${
      params.assinaturaPaciente === true
        ? '&assinaturaPaciente=true'
        : params.assinaturaPaciente === false
          ? '&assinaturaPaciente=false'
          : ''
    }${
      params.assinaturaProfissional === true
        ? '&assinaturaProfissional=true'
        : params.assinaturaProfissional === false
          ? '&assinaturaProfissional=false'
          : ''
    }${params.motivoReprovacao ? `&motivoReprovacao=${encodeURIComponent(params.motivoReprovacao)}` : ''}`,
  agendamentosAppointmentActions: (params: {
    agendamentoId: string;
    pacienteId: string;
    profissionalId: string;
    recursoId: string;
    convenioId: string;
    servicoId: string;
    pacienteNome?: string;
    profissionalNome?: string;
    servicoNome?: string;
    convenioNome?: string;
    recursoNome?: string;
    dataHoraInicio?: string;
    dataHoraFim?: string;
    tipoAtendimento?: string;
    status?: string;
    recebimento?: boolean;
  }) =>
    `/agendamentos/appointment-actions?agendamentoId=${encodeURIComponent(params.agendamentoId)}&pacienteId=${encodeURIComponent(params.pacienteId)}&profissionalId=${encodeURIComponent(params.profissionalId)}&recursoId=${encodeURIComponent(params.recursoId)}&convenioId=${encodeURIComponent(params.convenioId)}&servicoId=${encodeURIComponent(params.servicoId)}${
      params.pacienteNome ? `&pacienteNome=${encodeURIComponent(params.pacienteNome)}` : ''
    }${params.profissionalNome ? `&profissionalNome=${encodeURIComponent(params.profissionalNome)}` : ''}${
      params.servicoNome ? `&servicoNome=${encodeURIComponent(params.servicoNome)}` : ''
    }${params.convenioNome ? `&convenioNome=${encodeURIComponent(params.convenioNome)}` : ''}${
      params.recursoNome ? `&recursoNome=${encodeURIComponent(params.recursoNome)}` : ''
    }${params.dataHoraInicio ? `&dataHoraInicio=${encodeURIComponent(params.dataHoraInicio)}` : ''}${
      params.dataHoraFim ? `&dataHoraFim=${encodeURIComponent(params.dataHoraFim)}` : ''
    }${params.tipoAtendimento ? `&tipoAtendimento=${encodeURIComponent(params.tipoAtendimento)}` : ''}${
      params.status ? `&status=${encodeURIComponent(params.status)}` : ''
    }${
      params.recebimento === true ? '&recebimento=true' : params.recebimento === false ? '&recebimento=false' : ''
    }`,
  releaseActions: (params: {
    agendamentoId: string;
    pacienteId: string;
    pacienteNome?: string;
    pacienteWhatsapp?: string;
    profissionalNome?: string;
    servicoNome?: string;
    convenioNome?: string;
    dataHoraInicio?: string;
    status?: string;
    codLiberacao?: string;
    statusCodLiberacao?: string;
    dataCodLiberacao?: string;
  }) =>
    `/agendamentos/release-actions?agendamentoId=${encodeURIComponent(params.agendamentoId)}&pacienteId=${encodeURIComponent(params.pacienteId)}${
      params.pacienteNome ? `&pacienteNome=${encodeURIComponent(params.pacienteNome)}` : ''
    }${params.pacienteWhatsapp ? `&pacienteWhatsapp=${encodeURIComponent(params.pacienteWhatsapp)}` : ''}${
      params.profissionalNome ? `&profissionalNome=${encodeURIComponent(params.profissionalNome)}` : ''
    }${params.servicoNome ? `&servicoNome=${encodeURIComponent(params.servicoNome)}` : ''}${
      params.convenioNome ? `&convenioNome=${encodeURIComponent(params.convenioNome)}` : ''
    }${params.dataHoraInicio ? `&dataHoraInicio=${encodeURIComponent(params.dataHoraInicio)}` : ''}${
      params.status ? `&status=${encodeURIComponent(params.status)}` : ''
    }${params.codLiberacao ? `&codLiberacao=${encodeURIComponent(params.codLiberacao)}` : ''}${
      params.statusCodLiberacao ? `&statusCodLiberacao=${encodeURIComponent(params.statusCodLiberacao)}` : ''
    }${params.dataCodLiberacao ? `&dataCodLiberacao=${encodeURIComponent(params.dataCodLiberacao)}` : ''}`,
  releaseParticularActions: (params: {
    agendamentoId: string;
    agendamentoRaw?: string;
    agendamentoIds?: string;
    pacienteId: string;
    convenioId?: string;
    pacienteNome?: string;
    pacienteWhatsapp?: string;
    profissionalNome?: string;
    servicoNome?: string;
    servicoId?: string;
    mesAnoDisplay?: string;
    dataHoraInicio?: string;
    status?: string;
    recebimento?: boolean;
    dataLiberacao?: string;
    quantidade?: number;
    precoUnitario?: number;
    precoTotal?: number;
    tipoPagamento?: string;
    diaPagamento?: number | null;
    pagamentoAntecipado?: boolean | null;
  }) =>
    `/agendamentos/release-particular-actions?agendamentoId=${encodeURIComponent(params.agendamentoId)}${
      params.agendamentoRaw ? `&agendamentoRaw=${encodeURIComponent(params.agendamentoRaw)}` : ''
    }&pacienteId=${encodeURIComponent(params.pacienteId)}${
      params.pacienteNome ? `&pacienteNome=${encodeURIComponent(params.pacienteNome)}` : ''
    }${params.pacienteWhatsapp ? `&pacienteWhatsapp=${encodeURIComponent(params.pacienteWhatsapp)}` : ''}${
      params.profissionalNome ? `&profissionalNome=${encodeURIComponent(params.profissionalNome)}` : ''
    }${params.servicoNome ? `&servicoNome=${encodeURIComponent(params.servicoNome)}` : ''}${
      params.servicoId ? `&servicoId=${encodeURIComponent(params.servicoId)}` : ''
    }${
      params.dataHoraInicio ? `&dataHoraInicio=${encodeURIComponent(params.dataHoraInicio)}` : ''
    }${params.status ? `&status=${encodeURIComponent(params.status)}` : ''}${
      params.recebimento === true ? '&recebimento=true' : params.recebimento === false ? '&recebimento=false' : ''
    }${params.dataLiberacao ? `&dataLiberacao=${encodeURIComponent(params.dataLiberacao)}` : ''}${
      typeof params.quantidade === 'number' ? `&quantidade=${params.quantidade}` : ''
    }${typeof params.precoUnitario === 'number' ? `&precoUnitario=${params.precoUnitario}` : ''}${
      typeof params.precoTotal === 'number' ? `&precoTotal=${params.precoTotal}` : ''
    }${params.tipoPagamento ? `&tipoPagamento=${encodeURIComponent(params.tipoPagamento)}` : ''}${
      typeof params.diaPagamento === 'number' ? `&diaPagamento=${params.diaPagamento}` : ''
    }${
      params.pagamentoAntecipado === true
        ? '&pagamentoAntecipado=true'
        : params.pagamentoAntecipado === false
          ? '&pagamentoAntecipado=false'
          : ''
    }${params.agendamentoIds ? `&agendamentoIds=${encodeURIComponent(params.agendamentoIds)}` : ''}${
      params.convenioId ? `&convenioId=${encodeURIComponent(params.convenioId)}` : ''
    }${params.mesAnoDisplay ? `&mesAnoDisplay=${encodeURIComponent(params.mesAnoDisplay)}` : ''}`,
  financeCreateContaReceber: (params: {
    agendamentoId: string;
    agendamentoIds?: string;
    pacienteId: string;
    convenioId?: string;
    pacienteNome?: string;
    servicoNome?: string;
    mesAnoDisplay?: string;
    quantidade?: number;
    valorOriginal?: number;
    pagamentoAntecipado?: boolean | null;
    dataLiberacao?: string;
    isGrupoMensal?: boolean;
  }) =>
    `/finance/create-conta-receber?agendamentoId=${encodeURIComponent(params.agendamentoId)}${
      params.agendamentoIds ? `&agendamentoIds=${encodeURIComponent(params.agendamentoIds)}` : ''
    }&pacienteId=${encodeURIComponent(params.pacienteId)}${
      params.convenioId ? `&convenioId=${encodeURIComponent(params.convenioId)}` : ''
    }${params.pacienteNome ? `&pacienteNome=${encodeURIComponent(params.pacienteNome)}` : ''}${
      params.servicoNome ? `&servicoNome=${encodeURIComponent(params.servicoNome)}` : ''
    }${params.mesAnoDisplay ? `&mesAnoDisplay=${encodeURIComponent(params.mesAnoDisplay)}` : ''}${
      typeof params.quantidade === 'number' ? `&quantidade=${params.quantidade}` : ''
    }${typeof params.valorOriginal === 'number' ? `&valorOriginal=${params.valorOriginal}` : ''}${
      params.pagamentoAntecipado === true
        ? '&pagamentoAntecipado=true'
        : params.pagamentoAntecipado === false
          ? '&pagamentoAntecipado=false'
          : ''
    }${params.dataLiberacao ? `&dataLiberacao=${encodeURIComponent(params.dataLiberacao)}` : ''}${
      params.isGrupoMensal ? '&isGrupoMensal=true' : ''
    }`,
} as const;
