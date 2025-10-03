import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

const LGPD = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Política de LGPD</h1>
        <p className="text-xl text-gray-600 mb-8">
          Lei Geral de Proteção de Dados - Lei nº 13.709/2018
        </p>

        <div className="prose prose-lg text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Compromisso com a LGPD</h2>
            <p>
              A Clínica CelebraMente está comprometida com a proteção de dados pessoais e em conformidade
              com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Esta política detalha
              como processamos dados pessoais em atendimento aos princípios e requisitos da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Agentes de Tratamento</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Controlador de Dados</h3>
                <p>
                  <strong>Clínica CelebraMente</strong><br />
                  Responsável pelas decisões sobre o tratamento de dados pessoais.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Encarregado de Dados (DPO)</h3>
                <p>
                  E-mail: contato@celebramente.com.br<br />
                  Canal de comunicação entre o controlador, os titulares dos dados e a ANPD.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Bases Legais para Tratamento</h2>
            <p>Tratamos dados pessoais com base nas seguintes hipóteses legais:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Consentimento:</strong> Quando você autoriza expressamente o tratamento</li>
              <li><strong>Execução de Contrato:</strong> Para prestação de serviços de saúde</li>
              <li><strong>Cumprimento de Obrigação Legal:</strong> Atendimento a normas regulatórias e do CFM</li>
              <li><strong>Tutela da Saúde:</strong> Procedimentos realizados por profissionais de saúde</li>
              <li><strong>Proteção da Vida:</strong> Em situações emergenciais de saúde</li>
              <li><strong>Legítimo Interesse:</strong> Prevenção de fraudes e segurança do sistema</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Dados Pessoais Tratados</h2>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Dados Pessoais Comuns</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Dados de identificação (nome, CPF, RG, data de nascimento)</li>
                <li>Dados de contato (telefone, e-mail, endereço)</li>
                <li>Dados profissionais (para profissionais de saúde)</li>
                <li>Dados de acesso ao sistema (logs, IP, dispositivo)</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Dados Pessoais Sensíveis</h3>
              <p className="text-blue-700 font-medium mb-2">
                ⚕️ Dados relacionados à saúde são considerados sensíveis pela LGPD
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Histórico médico e prontuários</li>
                <li>Diagnósticos e tratamentos</li>
                <li>Informações sobre saúde mental</li>
                <li>Resultados de exames e avaliações</li>
                <li>Prescrições médicas</li>
              </ul>
              <p className="mt-4 text-sm text-gray-600">
                O tratamento de dados sensíveis de saúde é realizado exclusivamente por profissionais de
                saúde habilitados, para fins de prestação de serviços de saúde.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Finalidades do Tratamento</h2>
            <p>Utilizamos seus dados pessoais para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Prestação de serviços de saúde mental</li>
              <li>Gerenciamento de agendamentos e prontuários</li>
              <li>Faturamento e cobrança de serviços</li>
              <li>Comunicação sobre consultas e tratamentos</li>
              <li>Cumprimento de obrigações legais e regulatórias</li>
              <li>Defesa de direitos em processos judiciais</li>
              <li>Melhoria dos serviços e segurança do sistema</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Direitos dos Titulares</h2>
            <p>
              Em conformidade com o Art. 18 da LGPD, você tem os seguintes direitos:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Confirmação e Acesso:</strong> Confirmar se tratamos seus dados e acessá-los</li>
              <li><strong>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li><strong>Anonimização, Bloqueio ou Eliminação:</strong> Solicitar anonimização ou exclusão de dados desnecessários</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
              <li><strong>Eliminação:</strong> Excluir dados tratados com base em consentimento</li>
              <li><strong>Informação sobre Compartilhamento:</strong> Saber com quem compartilhamos seus dados</li>
              <li><strong>Informação sobre Consentimento:</strong> Saber sobre a possibilidade de não consentir</li>
              <li><strong>Revogação do Consentimento:</strong> Retirar consentimento a qualquer momento</li>
            </ul>

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h4 className="font-semibold text-amber-900 mb-2">⚠️ Limitações Legais</h4>
              <p className="text-amber-800 text-sm">
                Alguns direitos podem ter limitações devido a obrigações legais, como a necessidade de
                manter prontuários médicos por 20 anos (Resolução CFM nº 1.821/2007) ou outras
                obrigações regulatórias e contratuais.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Como Exercer Seus Direitos</h2>
            <p>
              Para exercer seus direitos como titular de dados pessoais:
            </p>
            <ol className="list-decimal pl-6 space-y-2 mt-4">
              <li>Entre em contato com nosso Encarregado de Dados (DPO)</li>
              <li>Identifique-se adequadamente para sua segurança</li>
              <li>Especifique qual direito deseja exercer</li>
              <li>Aguarde nossa resposta em até 15 dias</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Compartilhamento de Dados</h2>
            <p>Podemos compartilhar dados pessoais com:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Profissionais de Saúde:</strong> Envolvidos no seu tratamento</li>
              <li><strong>Operadores:</strong> Prestadores de serviços que processam dados em nosso nome (cloud, backup)</li>
              <li><strong>Autoridades:</strong> Quando exigido por lei ou ordem judicial</li>
              <li><strong>Planos de Saúde:</strong> Para faturamento (com seu consentimento)</li>
            </ul>
            <p className="mt-4">
              Todos os compartilhamentos respeitam os princípios da LGPD e são cobertos por acordos
              de confidencialidade e proteção de dados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Medidas de Segurança</h2>
            <p>
              Implementamos medidas técnicas e organizacionais para proteger seus dados:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controles de acesso baseados em função (RBAC)</li>
              <li>Autenticação multi-fator</li>
              <li>Monitoramento e logs de segurança</li>
              <li>Backups regulares e seguros</li>
              <li>Treinamento de equipe em proteção de dados</li>
              <li>Auditorias periódicas de segurança</li>
              <li>Plano de resposta a incidentes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Retenção de Dados</h2>
            <p>
              Mantemos seus dados pessoais pelo período necessário para:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cumprir a finalidade do tratamento</li>
              <li>Atender obrigações legais (mínimo de 20 anos para prontuários médicos)</li>
              <li>Exercer direitos em processos judiciais</li>
              <li>Garantir a segurança e prevenção de fraudes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Incidentes de Segurança</h2>
            <p>
              Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Comunicaremos à Autoridade Nacional de Proteção de Dados (ANPD)</li>
              <li>Notificaremos os titulares afetados</li>
              <li>Tomaremos medidas para reverter ou mitigar os efeitos</li>
              <li>Documentaremos o incidente conforme exigido pela LGPD</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Transferência Internacional</h2>
            <p>
              Atualmente, não realizamos transferência internacional de dados. Caso isso venha a ocorrer,
              garantiremos que o país de destino ou a organização internacional ofereça grau de proteção
              adequado ou implementaremos salvaguardas apropriadas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Direito de Petição à ANPD</h2>
            <p>
              Você tem o direito de apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD)
              se considerar que o tratamento de seus dados viola a LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. Atualizações desta Política</h2>
            <p>
              Esta política pode ser atualizada para refletir mudanças em nossas práticas de tratamento
              de dados ou alterações na legislação. Notificaremos sobre mudanças significativas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">15. Contato</h2>
            <p>
              Para questões sobre proteção de dados e LGPD:
            </p>
            <p className="mt-4">
              <strong>Clínica CelebraMente</strong><br />
              E-mail: contato@celebramente.com
            </p>
          </section>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Documentos Relacionados</h3>
            <p className="text-blue-800 text-sm">
              Para informações completas sobre como tratamos seus dados, consulte também nossa
              Política de Privacidade, Termos de Uso e Política de Cookies.
            </p>
          </div>

          <p className="text-sm text-gray-500 mt-12">
            Última atualização: Outubro de 2025
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LGPD;
