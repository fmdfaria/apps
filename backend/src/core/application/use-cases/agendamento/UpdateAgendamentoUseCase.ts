import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IAgendamentosRepository, IUpdateAgendamentoDTO } from '../../../domain/repositories/IAgendamentosRepository';
import { Agendamento } from '../../../domain/entities/Agendamento';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';
import { GoogleCalendarService } from '../../../../infra/services/GoogleCalendarService';
import { IProfissionaisRepository } from '../../../domain/repositories/IProfissionaisRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IConveniosRepository } from '../../../domain/repositories/IConveniosRepository';

@injectable()
export class UpdateAgendamentoUseCase {
  constructor(
    @inject('AgendamentosRepository')
    private agendamentosRepository: IAgendamentosRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository,
    @inject('GoogleCalendarService')
    private googleCalendarService: GoogleCalendarService,
    @inject('ProfissionaisRepository')
    private profissionaisRepository: IProfissionaisRepository,
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository,
    @inject('ConveniosRepository')
    private conveniosRepository: IConveniosRepository
  ) {}

  async execute(id: string, data: IUpdateAgendamentoDTO): Promise<Agendamento> {
    // Carregar agendamento atual para validações cruzadas
    const atual = await this.agendamentosRepository.findById(id);
    if (!atual) throw new AppError('Agendamento não encontrado.', 404);

    // Determinar valores-alvo após update
    const profissionalAlvo = data.profissionalId || (atual as any).profissionalId;
    const recursoAlvo = data.recursoId || (atual as any).recursoId;
    const pacienteAlvo = data.pacienteId || (atual as any).pacienteId;
    const dataHoraInicioAlvo = data.dataHoraInicio || (atual as any).dataHoraInicio;

    // Regras de conflito (Data+Hora): profissional, recurso, paciente
    if (data.dataHoraInicio || data.profissionalId) {
      const existenteProf = await this.agendamentosRepository.findByProfissionalAndDataHoraInicio(profissionalAlvo, data.dataHoraInicio || (atual as any).dataHoraInicio);
      if (existenteProf && existenteProf.id !== id) {
        throw new AppError('Conflito: profissional já possui agendamento nesta data e hora.', 400);
      }
    }
    if (data.dataHoraInicio || data.recursoId) {
      const existenteRecurso = await this.agendamentosRepository.findByRecursoAndDataHoraInicio(recursoAlvo, dataHoraInicioAlvo);
      if (existenteRecurso && existenteRecurso.id !== id) {
        throw new AppError('Conflito: recurso já possui agendamento nesta data e hora.', 400);
      }
    }
    if (data.dataHoraInicio || data.pacienteId) {
      const existentePaciente = await this.agendamentosRepository.findByPacienteAndDataHoraInicio(pacienteAlvo, dataHoraInicioAlvo);
      if (existentePaciente && existentePaciente.id !== id) {
        throw new AppError('Conflito: paciente já possui agendamento nesta data e hora.', 400);
      }
    }
    // Se dataHoraInicio ou servicoId forem atualizados, recalcular dataHoraFim
    let dataHoraFim = data.dataHoraFim;
    if (data.dataHoraInicio || data.servicoId) {
      const servicoId = data.servicoId || (atual as any).servicoId;
      const dataHoraInicio = data.dataHoraInicio || (atual as any).dataHoraInicio;
      const servico = await this.servicosRepository.findById(servicoId);
      if (!servico) {
        throw new AppError('Serviço não encontrado.', 404);
      }
      dataHoraFim = new Date(new Date(dataHoraInicio).getTime() + servico.duracaoMinutos * 60000);
    }

    // Remover campos que não fazem parte do schema do banco antes de enviar para o repositório
    const { tipoEdicaoRecorrencia, ...dadosParaBanco } = data;
    
    console.log('🔧 Debug - Dados sendo enviados para o banco:', {
      tipoEdicaoRecorrencia, // Log apenas para debug
      camposParaBanco: Object.keys(dadosParaBanco),
      dataHoraFimCalculada: dataHoraFim
    });
    
    const agendamentoAtualizado = await this.agendamentosRepository.update(id, { ...dadosParaBanco, dataHoraFim });
    
    // Integração com Google Calendar
    if (this.googleCalendarService.isIntegracaoAtiva() && agendamentoAtualizado.tipoAtendimento === 'online') {
      try {
        const statusMudouParaLiberado = data.status === 'LIBERADO' && atual.status !== 'LIBERADO';
        const mudouParaOnline = data.tipoAtendimento === 'online' && atual.tipoAtendimento !== 'online';
        const mudouDataHora = data.dataHoraInicio && data.dataHoraInicio.getTime() !== atual.dataHoraInicio.getTime();

        // Se mudou para online ou status LIBERADO e não tem evento ainda, criar novo evento
        if ((statusMudouParaLiberado || mudouParaOnline) && !agendamentoAtualizado.urlMeet) {
          const [profissional, paciente, convenio, servicoCompleto] = await Promise.all([
            this.profissionaisRepository.findById(agendamentoAtualizado.profissionalId),
            this.pacientesRepository.findById(agendamentoAtualizado.pacienteId),
            this.conveniosRepository.findById(agendamentoAtualizado.convenioId),
            this.servicosRepository.findById(agendamentoAtualizado.servicoId)
          ]);

          if (profissional && paciente && convenio && servicoCompleto) {
            const googleEvent = await this.googleCalendarService.criarEventoComMeet({
              pacienteNome: paciente.nomeCompleto,
              pacienteEmail: paciente.email || undefined,
              profissionalNome: profissional.nome,
              profissionalEmail: profissional.email,
              servicoNome: servicoCompleto.nome,
              convenioNome: convenio.nome,
              dataHoraInicio: agendamentoAtualizado.dataHoraInicio,
              dataHoraFim: agendamentoAtualizado.dataHoraFim,
              agendamentoId: agendamentoAtualizado.id
            });

            // Atualizar com URL do Meet e Event ID
            return await this.agendamentosRepository.update(id, {
              urlMeet: googleEvent.urlMeet,
              googleEventId: googleEvent.eventId
            });
          }
        }
        // Se mudou data/hora, verificar se é série recorrente (online ou presencial)
        else if (mudouDataHora) {
          // Para agendamentos online: usar googleEventId
          // Para agendamentos presenciais: usar lógica de paciente+profissional+serviço+horário
          let serieRecorrente: any[] = [];
          
          if (atual.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
            // Buscar agendamentos com mesmo googleEventId (série recorrente online)
            const agendamentosDoMesmoEvento = await this.agendamentosRepository.findAll({
              profissionalId: agendamentoAtualizado.profissionalId,
              pacienteId: agendamentoAtualizado.pacienteId,
              servicoId: agendamentoAtualizado.servicoId,
              limit: 100
            });

            // Filtrar apenas os que tem o mesmo googleEventId
            serieRecorrente = agendamentosDoMesmoEvento.data.filter(ag => 
              ag.googleEventId === atual.googleEventId && ag.id !== atual.id
            );
          } else {
            // Para agendamentos presenciais, usar lógica similar ao frontend
            // Buscar agendamentos com mesmo profissional, paciente, serviço e MESMA HORA
            const dataAtual = atual.dataHoraInicio;
            const horaAtual = `${dataAtual.getHours().toString().padStart(2, '0')}:${dataAtual.getMinutes().toString().padStart(2, '0')}`;
            
            // Buscar em uma janela temporal mais ampla para capturar toda a série
            const dataInicio = new Date(dataAtual);
            dataInicio.setDate(dataInicio.getDate() - 30); // 30 dias antes
            
            const dataFim = new Date(dataAtual);
            dataFim.setDate(dataFim.getDate() + 90); // 90 dias depois
            
            const agendamentosCandidatos = await this.agendamentosRepository.findAll({
              profissionalId: agendamentoAtualizado.profissionalId,
              pacienteId: agendamentoAtualizado.pacienteId,
              servicoId: agendamentoAtualizado.servicoId,
              dataInicio: dataInicio,
              dataFim: dataFim,
              status: 'AGENDADO',
              limit: 100
            });
            
            // Filtrar apenas os que têm a mesma hora e não são o agendamento atual
            serieRecorrente = agendamentosCandidatos.data.filter(ag => {
              if (ag.id === atual.id) return false;
              const horaAg = `${ag.dataHoraInicio.getHours().toString().padStart(2, '0')}:${ag.dataHoraInicio.getMinutes().toString().padStart(2, '0')}`;
              return horaAg === horaAtual;
            });
          }

          const [profissional, paciente, convenio, servicoCompleto] = await Promise.all([
            this.profissionaisRepository.findById(agendamentoAtualizado.profissionalId),
            this.pacientesRepository.findById(agendamentoAtualizado.pacienteId),
            this.conveniosRepository.findById(agendamentoAtualizado.convenioId),
            this.servicosRepository.findById(agendamentoAtualizado.servicoId)
          ]);

          if (profissional && paciente && convenio && servicoCompleto) {
          if (serieRecorrente.length > 0) {
            // É uma série recorrente - precisamos decidir como editar
            console.log('🔍 Detectada edição em série recorrente:', {
              agendamentoEditado: agendamentoAtualizado.id,
              totalNaSerie: serieRecorrente.length + 1,
              googleEventId: atual.googleEventId || 'N/A (presencial)',
              tipoEdicao: tipoEdicaoRecorrencia
            });

            // Separar agendamentos anteriores e futuros
            const agendamentosAnteriores = serieRecorrente.filter(ag => 
              new Date(ag.dataHoraInicio) < new Date(agendamentoAtualizado.dataHoraInicio)
            );
            const agendamentosFuturos = serieRecorrente.filter(ag => 
              new Date(ag.dataHoraInicio) > new Date(agendamentoAtualizado.dataHoraInicio)
            );

            // Mapear as opções do modal do frontend:
            // Modal: "Apenas este agendamento" = 'apenas_esta'
            // Modal: "Esta e futuras" = 'esta_e_futuras' (não altera anteriores)
            // Modal: "Toda a série" = 'toda_serie' (altera todos)
            const tipoEdicao = tipoEdicaoRecorrencia || 'apenas_esta';
            
            console.log('🎯 Decisão de edição:', {
              tipoEdicaoFornecido: tipoEdicaoRecorrencia,
              tipoEdicaoEscolhido: tipoEdicao,
              totalAnteriores: agendamentosAnteriores.length,
              totalFuturos: agendamentosFuturos.length,
              totalSerie: serieRecorrente.length + 1
            });

              if (tipoEdicao === 'toda_serie') {
                // Editar TODA a série (todos os agendamentos)
                console.log('📅 Editando TODA a série recorrente');
                
                await this.googleCalendarService.editarTodaASerie(atual.googleEventId, {
                  pacienteNome: paciente.nomeCompleto,
                  pacienteEmail: paciente.email || undefined,
                  profissionalNome: profissional.nome,
                  profissionalEmail: profissional.email,
                  servicoNome: servicoCompleto.nome,
                  convenioNome: convenio.nome,
                  dataHoraInicio: agendamentoAtualizado.dataHoraInicio,
                  dataHoraFim: agendamentoAtualizado.dataHoraFim,
                  agendamentoId: agendamentoAtualizado.id
                });

                // Calcular diferença de tempo entre nova e antiga data/hora
                const deltaMilliseconds = agendamentoAtualizado.dataHoraInicio.getTime() - atual.dataHoraInicio.getTime();
                
                // Atualizar TODOS os outros agendamentos da série no banco
                const updatePromises = serieRecorrente.map(ag => {
                  const novaDataHoraInicio = new Date(ag.dataHoraInicio.getTime() + deltaMilliseconds);
                  const novaDataHoraFim = new Date(ag.dataHoraFim.getTime() + deltaMilliseconds);
                  return this.agendamentosRepository.update(ag.id, {
                    dataHoraInicio: novaDataHoraInicio,
                    dataHoraFim: novaDataHoraFim
                  });
                });
                
                await Promise.all(updatePromises);
                console.log(`✅ ${serieRecorrente.length + 1} agendamentos da série atualizados com sucesso`);

            } else if (tipoEdicao === 'esta_e_futuras') {
              // Editar apenas "esta e as futuras ocorrências" (não altera anteriores)
              console.log('📅 Editando esta e futuras ocorrências da série');
              console.log(`ℹ️ Agendamentos anteriores (${agendamentosAnteriores.length}) NÃO serão alterados`);
              
              // Para agendamentos online, atualizar Google Calendar se necessário
              if (atual.googleEventId && this.googleCalendarService.isIntegracaoAtiva()) {
                // Detectar tipo de recorrência baseado no intervalo entre agendamentos
                let tipoRecorrencia: 'semanal' | 'quinzenal' | 'mensal' = 'semanal';
                if (agendamentosFuturos.length > 0) {
                  const agendamentoAtual = new Date(atual.dataHoraInicio);
                  const proximoAgendamento = new Date(agendamentosFuturos[0].dataHoraInicio);
                  const diferencaDias = Math.abs(proximoAgendamento.getTime() - agendamentoAtual.getTime()) / (1000 * 60 * 60 * 24);
                  
                  if (diferencaDias <= 8) {
                    tipoRecorrencia = 'semanal';
                  } else if (diferencaDias <= 16) {
                    tipoRecorrencia = 'quinzenal';
                  } else {
                    tipoRecorrencia = 'mensal';
                  }
                }
                
                const novoEventId = await this.googleCalendarService.editarSerieAPartirDe(
                  atual.googleEventId,
                  agendamentoAtualizado.dataHoraInicio,
                  {
                    pacienteNome: paciente.nomeCompleto,
                    pacienteEmail: paciente.email || undefined,
                    profissionalNome: profissional.nome,
                    profissionalEmail: profissional.email,
                    servicoNome: servicoCompleto.nome,
                    convenioNome: convenio.nome,
                    dataHoraInicio: agendamentoAtualizado.dataHoraInicio,
                    dataHoraFim: agendamentoAtualizado.dataHoraFim,
                    agendamentoId: agendamentoAtualizado.id,
                    recorrencia: {
                      tipo: tipoRecorrencia,
                      repeticoes: agendamentosFuturos.length + 1
                    }
                  }
                );

                // Calcular diferença de tempo entre nova e antiga data/hora
                const deltaMilliseconds = agendamentoAtualizado.dataHoraInicio.getTime() - atual.dataHoraInicio.getTime();
                
                // Atualizar apenas os agendamentos futuros com nova data/hora e googleEventId
                const updatePromises = agendamentosFuturos.map(ag => {
                  const novaDataHoraInicio = new Date(ag.dataHoraInicio.getTime() + deltaMilliseconds);
                  const novaDataHoraFim = new Date(ag.dataHoraFim.getTime() + deltaMilliseconds);
                  return this.agendamentosRepository.update(ag.id, {
                    dataHoraInicio: novaDataHoraInicio,
                    dataHoraFim: novaDataHoraFim,
                    googleEventId: novoEventId
                  });
                });
                
                // Atualizar também o agendamento atual com o novo googleEventId
                await this.agendamentosRepository.update(agendamentoAtualizado.id, {
                  googleEventId: novoEventId
                });
                
                await Promise.all(updatePromises);
              } else {
                // Para agendamentos presenciais, apenas atualizar no banco
                const deltaMilliseconds = agendamentoAtualizado.dataHoraInicio.getTime() - atual.dataHoraInicio.getTime();
                
                // Atualizar apenas os agendamentos futuros com nova data/hora
                const updatePromises = agendamentosFuturos.map(ag => {
                  const novaDataHoraInicio = new Date(ag.dataHoraInicio.getTime() + deltaMilliseconds);
                  const novaDataHoraFim = new Date(ag.dataHoraFim.getTime() + deltaMilliseconds);
                  return this.agendamentosRepository.update(ag.id, {
                    dataHoraInicio: novaDataHoraInicio,
                    dataHoraFim: novaDataHoraFim
                  });
                });
                
                await Promise.all(updatePromises);
              }
              
              console.log(`✅ ${agendamentosFuturos.length + 1} agendamentos (esta e futuras) atualizados com sucesso`);

              } else {
                // Editar apenas esta ocorrência (tipoEdicao === 'apenas_esta' ou não há futuros)
                console.log('📅 Editando apenas esta ocorrência específica');
                
                const novoEventId = await this.googleCalendarService.editarOcorrenciaEspecifica(
                  atual.googleEventId,
                  new Date(atual.dataHoraInicio), // Data original da ocorrência
                  {
                    pacienteNome: paciente.nomeCompleto,
                    pacienteEmail: paciente.email || undefined,
                    profissionalNome: profissional.nome,
                    profissionalEmail: profissional.email,
                    servicoNome: servicoCompleto.nome,
                    convenioNome: convenio.nome,
                    dataHoraInicio: agendamentoAtualizado.dataHoraInicio,
                    dataHoraFim: agendamentoAtualizado.dataHoraFim,
                    agendamentoId: agendamentoAtualizado.id
                  }
                );

                // Atualizar apenas este agendamento com o novo googleEventId
                await this.agendamentosRepository.update(agendamentoAtualizado.id, {
                  googleEventId: novoEventId
                });
              }

            } else {
              // Não é série recorrente - evento único
              console.log('📅 Editando evento único (não recorrente)');
              await this.googleCalendarService.atualizarEvento(atual.googleEventId, {
                pacienteNome: paciente.nomeCompleto,
                pacienteEmail: paciente.email || undefined,
                profissionalNome: profissional.nome,
                profissionalEmail: profissional.email,
                servicoNome: servicoCompleto.nome,
                convenioNome: convenio.nome,
                dataHoraInicio: agendamentoAtualizado.dataHoraInicio,
                dataHoraFim: agendamentoAtualizado.dataHoraFim,
                agendamentoId: agendamentoAtualizado.id
              });
            }
          }
        }
        // Se mudou de online para presencial, deletar evento
        else if (atual.googleEventId && atual.tipoAtendimento === 'online' && data.tipoAtendimento === 'presencial') {
          await this.googleCalendarService.deletarEvento(atual.googleEventId);
          // Limpar dados do Google Calendar
          return await this.agendamentosRepository.update(id, {
            urlMeet: null,
            googleEventId: null
          });
        }
      } catch (error) {
        console.error('Erro na integração Google Calendar:', error);
        // Continua sem falhar a atualização
      }
    }
    
    return agendamentoAtualizado;
  }
} 