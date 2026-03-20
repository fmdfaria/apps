export const routes = {
  authLogin: '/(auth)/login',
  authFirstLogin: '/(auth)/first-login',
  tabsRoot: '/(tabs)',
  modalQuickActions: '/modals/quick-actions',
  waitlist: '/waitlist',
  release: '/release',
  releaseParticular: '/release-particular',
  tasks: '/tasks/index',
  finance: '/finance/index',
  notifications: '/notifications/index',
  settings: '/settings/index',
  customerDetails: (id: string) => `/customers/${id}`,
  customerActions: (id: string, nome?: string) =>
    `/customers/actions?id=${encodeURIComponent(id)}${nome ? `&nome=${encodeURIComponent(nome)}` : ''}`,
  customerEdit: (id: string) => `/customers/edit?id=${encodeURIComponent(id)}`,
  customerAttachments: (id: string, nome?: string) =>
    `/customers/attachments?id=${encodeURIComponent(id)}${nome ? `&nome=${encodeURIComponent(nome)}` : ''}`,
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
} as const;
