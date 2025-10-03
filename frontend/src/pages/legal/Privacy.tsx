import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Política de Privacidade</h1>

        <div className="prose prose-lg text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Introdução</h2>
            <p>
              A Clínica CelebraMente está comprometida em proteger a privacidade e os dados pessoais de seus pacientes,
              profissionais e usuários do sistema. Esta Política de Privacidade descreve como coletamos, usamos,
              armazenamos e protegemos suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Informações Coletadas</h2>
            <p>Coletamos as seguintes categorias de informações:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dados de Identificação:</strong> nome completo, CPF, RG, data de nascimento</li>
              <li><strong>Dados de Contato:</strong> endereço, telefone, e-mail</li>
              <li><strong>Dados de Saúde:</strong> histórico médico, diagnósticos, tratamentos, prontuários</li>
              <li><strong>Dados de Acesso:</strong> credenciais de login, logs de acesso ao sistema</li>
              <li><strong>Dados Financeiros:</strong> informações de pagamento e faturamento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Uso das Informações</h2>
            <p>Utilizamos suas informações para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Prestação de serviços de saúde mental</li>
              <li>Gerenciamento de agendamentos e consultas</li>
              <li>Comunicação sobre tratamentos e lembretes</li>
              <li>Faturamento e questões administrativas</li>
              <li>Cumprimento de obrigações legais e regulatórias</li>
              <li>Melhoria dos serviços prestados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Compartilhamento de Dados</h2>
            <p>
              Seus dados pessoais e de saúde não serão compartilhados com terceiros, exceto:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Com profissionais de saúde envolvidos no seu tratamento</li>
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Com prestadores de serviços que auxiliam nas operações da clínica (sob acordo de confidencialidade)</li>
              <li>Com seu consentimento expresso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Segurança dos Dados</h2>
            <p>
              Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado,
              alteração, divulgação ou destruição, incluindo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controle de acesso baseado em funções</li>
              <li>Autenticação multi-fator</li>
              <li>Backups regulares e seguros</li>
              <li>Monitoramento de segurança contínuo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Seus Direitos</h2>
            <p>
              De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem direito a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Confirmar a existência de tratamento de dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados</li>
              <li>Solicitar a portabilidade dos dados</li>
              <li>Revogar o consentimento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Retenção de Dados</h2>
            <p>
              Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta política,
              observando os prazos legais de guarda de prontuários médicos (mínimo de 20 anos após a última consulta,
              conforme Resolução CFM nº 1.821/2007).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas
              através do nosso sistema ou por e-mail.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Contato</h2>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre esta Política de Privacidade, entre em contato:
            </p>
            <p className="mt-4">
              <strong>Clínica CelebraMente</strong><br />
              E-mail: contato@celebramente.com<br />
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-12">
            Última atualização: Outubro de 2025
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;
