import { injectable, inject } from 'tsyringe';
import { IConfiguracoesRepository } from '@/core/domain/repositories/IConfiguracoesRepository';

/**
 * Serviço responsável pelo cálculo da data de vencimento de pedidos médicos
 * baseado nas configurações do convênio do paciente.
 *
 * Regra de negócio:
 * - Busca configuração na tabela 'configuracoes' com:
 *   entidade_tipo = 'convenio'
 *   entidade_id = <convenioId>
 *   contexto = 'pacientes_pedidos'
 *   chave = 'vencimento'
 * - Se existir configuração: data_vencimento = dataPedidoMedico + <valor> meses
 * - Se NÃO existir configuração: retorna NULL
 */
@injectable()
export class PedidoVencimentoService {
  constructor(
    @inject('ConfiguracoesRepository')
    private configuracoesRepository: IConfiguracoesRepository
  ) {}

  /**
   * Calcula a data de vencimento do pedido médico
   * @param dataPedidoMedico - Data do pedido médico
   * @param convenioId - ID do convênio do paciente
   * @returns Data de vencimento calculada ou null se não houver configuração
   */
  async calcularDataVencimento(
    dataPedidoMedico: Date,
    convenioId: string
  ): Promise<Date | null> {
    try {
      // Buscar configuração do convênio
      const config = await this.configuracoesRepository.findByKey(
        'convenio',
        convenioId,
        'pacientes_pedidos',
        'vencimento'
      );

      // Se não tiver configuração, retorna null
      if (!config || !config.valor || !config.ativo) {
        return null;
      }

      // Converter valor para número de meses
      const mesesValidade = parseInt(config.valor, 10);

      if (isNaN(mesesValidade) || mesesValidade <= 0) {
        console.warn(`[PedidoVencimentoService] Valor de vencimento inválido para convênio ${convenioId}: ${config.valor}`);
        return null;
      }

      // Calcular data de vencimento
      const dataVencimento = new Date(dataPedidoMedico);
      dataVencimento.setMonth(dataVencimento.getMonth() + mesesValidade);

      return dataVencimento;
    } catch (error) {
      console.error('[PedidoVencimentoService] Erro ao calcular data de vencimento:', error);
      return null;
    }
  }
}
