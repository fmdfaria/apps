import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

const Cookies = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Política de Cookies</h1>

        <div className="prose prose-lg text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. O que são Cookies?</h2>
            <p>
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita um site.
              Eles são amplamente utilizados para fazer os sites funcionarem de forma mais eficiente e fornecer
              informações aos proprietários do site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Como Utilizamos Cookies</h2>
            <p>
              O sistema da Clínica CelebraMente utiliza cookies para melhorar sua experiência de navegação e
              garantir o funcionamento adequado das funcionalidades do sistema.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Tipos de Cookies Utilizados</h2>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Cookies Essenciais</h3>
              <p>
                Necessários para o funcionamento básico do sistema. Sem eles, você não poderá utilizar
                funcionalidades importantes como login e gerenciamento de sessão.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Token de Autenticação:</strong> Mantém você conectado ao sistema</li>
                <li><strong>Sessão:</strong> Armazena informações temporárias da sua sessão</li>
                <li><strong>Preferências de Segurança:</strong> Ajuda a proteger sua conta</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Cookies Funcionais</h3>
              <p>
                Permitem que o sistema lembre suas escolhas e preferências para oferecer uma experiência
                personalizada.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Preferências de Interface:</strong> Tema, idioma e layout</li>
                <li><strong>Configurações de Usuário:</strong> Suas preferências personalizadas</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Cookies Analíticos</h3>
              <p>
                Ajudam-nos a entender como os usuários interagem com o sistema, permitindo melhorias contínuas.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Análise de Uso:</strong> Páginas visitadas, tempo de permanência</li>
                <li><strong>Desempenho:</strong> Monitoramento de erros e performance</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3.4 Cookies de Segurança</h3>
              <p>
                Utilizados para proteger sua conta e detectar atividades suspeitas.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Prevenção de Fraude:</strong> Detecta tentativas de acesso não autorizado</li>
                <li><strong>Proteção CSRF:</strong> Previne ataques de falsificação de requisição</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Cookies de Terceiros</h2>
            <p>
              Eventualmente, utilizamos cookies de terceiros confiáveis para funcionalidades específicas:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Serviços de autenticação</li>
              <li>Ferramentas de análise (quando aplicável)</li>
              <li>Serviços de suporte e chat</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Duração dos Cookies</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cookies de Sessão</h3>
                <p>Temporários e são excluídos quando você fecha o navegador.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cookies Persistentes</h3>
                <p>
                  Permanecem no seu dispositivo por um período específico (geralmente até 30 dias)
                  ou até que você os exclua manualmente.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Gerenciamento de Cookies</h2>
            <p>
              Você pode controlar e gerenciar cookies de várias maneiras:
            </p>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.1 Configurações do Navegador</h3>
              <p>
                A maioria dos navegadores permite que você:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Veja quais cookies estão armazenados</li>
                <li>Exclua todos ou cookies específicos</li>
                <li>Bloqueie cookies de sites específicos</li>
                <li>Bloqueie todos os cookies de terceiros</li>
                <li>Configure o navegador para excluir cookies ao fechar</li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">6.2 Consequências de Desabilitar Cookies</h3>
              <p className="text-amber-700 font-medium">
                ⚠️ Importante: Desabilitar cookies essenciais impedirá o funcionamento adequado do sistema,
                incluindo a impossibilidade de fazer login e utilizar funcionalidades básicas.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Privacidade e Proteção de Dados</h2>
            <p>
              Os dados coletados através de cookies são tratados de acordo com nossa Política de Privacidade
              e com a Lei Geral de Proteção de Dados (LGPD). Não compartilhamos informações de cookies com
              terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Atualizações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças em nossas
              práticas ou por outros motivos operacionais, legais ou regulatórios.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Mais Informações</h2>
            <p>
              Para saber mais sobre como tratamos seus dados pessoais, consulte nossa Política de Privacidade
              e Política de LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Contato</h2>
            <p>
              Se você tiver dúvidas sobre nossa utilização de cookies:
            </p>
            <p className="mt-4">
              <strong>Clínica CelebraMente</strong><br />
              E-mail: contato@celebramente.com.br
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

export default Cookies;
