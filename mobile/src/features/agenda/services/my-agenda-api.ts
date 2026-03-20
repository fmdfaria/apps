import { api } from '@/services/api/client';
import type { AppointmentStatus, PaginatedAppointmentsResponse } from '@/features/agenda/types';

type GetProfessionalAppointmentsParams = {
  profissionalId: string;
  dataInicio: string;
  dataFim: string;
  page?: number;
  limit?: number;
};

export async function getProfessionalAppointments({
  profissionalId,
  dataInicio,
  dataFim,
  page = 1,
  limit = 100,
}: GetProfessionalAppointmentsParams) {
  const response = await api.get<PaginatedAppointmentsResponse>('/agendamentos', {
    params: {
      profissionalId,
      dataInicio,
      dataFim,
      page,
      limit,
      orderBy: 'dataHoraInicio',
      orderDirection: 'asc',
    },
  });

  const mapped = response.data.data.map((appointment) => {
    const pacienteNome = appointment.pacienteNome || appointment.paciente?.nomeCompleto || '';
    const profissionalNome = appointment.profissionalNome || appointment.profissional?.nome || '';
    const convenioNome = appointment.convenioNome || appointment.convenio?.nome || '';
    const servicoNome = appointment.servicoNome || appointment.servico?.nome || '';
    const recursoNome = appointment.recursoNome || appointment.recurso?.nome || '';

    return {
      ...appointment,
      pacienteNome,
      profissionalNome,
      convenioNome,
      servicoNome,
      recursoNome,
    };
  });

  return {
    ...response.data,
    data: mapped,
  };
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus) {
  const response = await api.patch(`/agendamentos/${id}/status`, { status });
  return response.data;
}

export async function getMyProfessional() {
  const response = await api.get<{ id: string; nome: string }>('/profissionais/me');
  return response.data;
}
