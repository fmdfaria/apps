/**
 * EXEMPLOS DE USO DO SERIESMANAGER
 * 
 * Este arquivo contém exemplos de como usar o SeriesManager
 * para gerenciar séries de agendamentos recorrentes.
 */

import { container } from 'tsyringe';
import { SeriesManager } from './SeriesManager';

// ===============================================
// EXEMPLO 1: VERIFICAR SE AGENDAMENTO É SÉRIE
// ===============================================
async function exemploVerificarSerie() {
  const seriesManager = container.resolve<SeriesManager>('SeriesManager');
  
  const agendamentoId = 'some-uuid-here';
  const serie = await seriesManager.findSerieByAgendamentoId(agendamentoId);
  
  if (serie) {
    console.log(`Agendamento faz parte de série com ${serie.totalAgendamentos} agendamentos`);
    console.log(`Tem Google Calendar: ${serie.temGoogleCalendar}`);
    console.log(`É master: ${serie.isMaster}`);
  } else {
    console.log('Agendamento individual (não é série)');
  }
}

// ===============================================
// EXEMPLO 2: ATUALIZAR "APENAS ESTA" OCORRÊNCIA
// ===============================================
async function exemploUpdateApenaEsta() {
  const seriesManager = container.resolve<SeriesManager>('SeriesManager');
  
  const agendamentoId = 'some-uuid-here';
  const novosDados = {
    dataHoraInicio: new Date('2024-03-20T09:00:00'),
    dataHoraFim: new Date('2024-03-20T10:00:00'),
    status: 'REAGENDADO'
  };
  
  // Só este agendamento será alterado
  await seriesManager.updateApenaEsta(agendamentoId, novosDados);
  console.log('✅ Apenas esta ocorrência foi atualizada');
}

// ===============================================
// EXEMPLO 3: ATUALIZAR "ESTA E FUTURAS"
// ===============================================
async function exemploUpdateEstaEFuturas() {
  const seriesManager = container.resolve<SeriesManager>('SeriesManager');
  
  const agendamentoId = 'some-uuid-here'; // Ex: agendamento do dia 17/03
  const novosDados = {
    dataHoraInicio: new Date('2024-03-17T09:00:00'), // Nova hora: 09:00
    dataHoraFim: new Date('2024-03-17T10:00:00')
  };
  
  // Agendamentos de 17/03 em diante serão alterados
  // Agendamentos anteriores (ex: 10/03) ficam inalterados
  await seriesManager.updateEstaEFuturas(agendamentoId, novosDados);
  console.log('✅ Esta e futuras ocorrências foram atualizadas');
}

// ===============================================
// EXEMPLO 4: ATUALIZAR "TODA A SÉRIE"
// ===============================================
async function exemploUpdateTodaSerie() {
  const seriesManager = container.resolve<SeriesManager>('SeriesManager');
  
  const agendamentoId = 'some-uuid-here';
  const novosDados = {
    dataHoraInicio: new Date('2024-03-10T08:30:00'), // Nova hora para todos
    dataHoraFim: new Date('2024-03-10T09:30:00'),
    status: 'CONFIRMADO'
  };
  
  // TODOS os agendamentos da série serão alterados
  await seriesManager.updateTodaSerie(agendamentoId, novosDados);
  console.log('✅ Toda a série foi atualizada');
}

// ===============================================
// EXEMPLO 5: EXCLUSÕES
// ===============================================
async function exemploExclusoes() {
  const seriesManager = container.resolve<SeriesManager>('SeriesManager');
  const agendamentoId = 'some-uuid-here';
  
  // Opção 1: Excluir apenas esta ocorrência
  await seriesManager.deleteApenaEsta(agendamentoId);
  
  // Opção 2: Excluir esta e futuras ocorrências  
  // await seriesManager.deleteEstaEFuturas(agendamentoId);
  
  // Opção 3: Excluir toda a série
  // await seriesManager.deleteTodaSerie(agendamentoId);
}

// ===============================================
// EXEMPLO 6: VERIFICAR POSIÇÃO NA SÉRIE
// ===============================================
async function exemploVerificarPosicao() {
  const seriesManager = container.resolve<SeriesManager>('SeriesManager');
  
  const agendamentoId = 'some-uuid-here';
  const posicao = await seriesManager.getSeriePosition(agendamentoId);
  
  if (posicao) {
    console.log(`Agendamento é o ${posicao.posicao}º de ${posicao.totalNaSerie}`);
    console.log(`É anterior ao hoje: ${posicao.isAnterior}`);
    console.log(`É hoje: ${posicao.isAtual}`);
    console.log(`É futuro: ${posicao.isFuturo}`);
  }
}

// ===============================================
// EXEMPLO 7: USO NO USE CASE
// ===============================================
async function exemploUsoNoUseCase() {
  const seriesManager = container.resolve<SeriesManager>('SeriesManager');
  
  // Simular dados vindos do controller
  const agendamentoId = 'some-uuid-here';
  const tipoEdicaoRecorrencia = 'esta_e_futuras'; // vem do frontend
  const dadosAtualizacao = {
    dataHoraInicio: new Date('2024-03-17T10:00:00'),
    dataHoraFim: new Date('2024-03-17T11:00:00')
  };
  
  // Lógica do Use Case
  switch(tipoEdicaoRecorrencia) {
    case 'apenas_esta':
      await seriesManager.updateApenaEsta(agendamentoId, dadosAtualizacao);
      console.log('✅ Atualização "apenas esta" concluída');
      break;
      
    case 'esta_e_futuras':
      await seriesManager.updateEstaEFuturas(agendamentoId, dadosAtualizacao);
      console.log('✅ Atualização "esta e futuras" concluída');
      break;
      
    case 'toda_serie':
      await seriesManager.updateTodaSerie(agendamentoId, dadosAtualizacao);
      console.log('✅ Atualização "toda série" concluída');
      break;
      
    default:
      // Agendamento individual - usar método tradicional
      console.log('⚡ Agendamento individual, usar repository direto');
      break;
  }
}

export {
  exemploVerificarSerie,
  exemploUpdateApenaEsta,
  exemploUpdateEstaEFuturas,
  exemploUpdateTodaSerie,
  exemploExclusoes,
  exemploVerificarPosicao,
  exemploUsoNoUseCase
};