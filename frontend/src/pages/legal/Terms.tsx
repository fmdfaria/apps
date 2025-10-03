import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

const Terms = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Termos de Uso</h1>

        <div className="prose prose-lg text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar o sistema da Clínica CelebraMente, você concorda em cumprir e estar vinculado
              a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve utilizar
              nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Definições</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Sistema:</strong> Plataforma digital de gestão de consultas e agendamentos da Clínica CelebraMente</li>
              <li><strong>Usuário:</strong> Qualquer pessoa que acesse o sistema (paciente, profissional ou administrador)</li>
              <li><strong>Serviços:</strong> Funcionalidades oferecidas através do sistema</li>
              <li><strong>Clínica:</strong> Clínica CelebraMente e seus representantes legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. Cadastro e Conta de Usuário</h2>
            <p>Para utilizar o sistema, você deve:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fornecer informações verdadeiras, precisas e completas durante o cadastro</li>
              <li>Manter suas credenciais de acesso em sigilo</li>
              <li>Notificar imediatamente a clínica sobre qualquer uso não autorizado de sua conta</li>
              <li>Atualizar suas informações cadastrais quando necessário</li>
              <li>Ser responsável por todas as atividades realizadas através de sua conta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Uso Permitido</h2>
            <p>Você concorda em utilizar o sistema apenas para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Agendar e gerenciar consultas</li>
              <li>Acessar informações de saúde autorizadas</li>
              <li>Comunicar-se com profissionais da clínica</li>
              <li>Gerenciar dados cadastrais e financeiros relacionados ao seu tratamento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Uso Proibido</h2>
            <p>É expressamente proibido:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Utilizar o sistema para fins ilegais ou não autorizados</li>
              <li>Tentar acessar áreas restritas ou dados de outros usuários</li>
              <li>Interferir no funcionamento do sistema ou em sua segurança</li>
              <li>Copiar, modificar ou distribuir o conteúdo do sistema sem autorização</li>
              <li>Utilizar bots, scripts ou ferramentas automatizadas não autorizadas</li>
              <li>Fazer engenharia reversa ou tentar extrair código-fonte</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Agendamentos e Cancelamentos</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Agendamentos estão sujeitos à disponibilidade dos profissionais</li>
              <li>Cancelamentos devem ser realizados com antecedência mínima estabelecida pela clínica</li>
              <li>Faltas sem aviso prévio podem resultar em cobrança ou restrições no agendamento</li>
              <li>A clínica se reserva o direito de cancelar ou reagendar consultas quando necessário</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo do sistema, incluindo textos, gráficos, logos, ícones, imagens e software,
              é propriedade da Clínica CelebraMente ou de seus fornecedores e está protegido por leis de
              propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Limitação de Responsabilidade</h2>
            <p>A Clínica CelebraMente não se responsabiliza por:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Interrupções temporárias no sistema devido a manutenção ou problemas técnicos</li>
              <li>Perda de dados decorrente de ações do usuário</li>
              <li>Danos indiretos, incidentais ou consequenciais resultantes do uso do sistema</li>
              <li>Conteúdo de terceiros ou links externos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Modificações no Sistema</h2>
            <p>
              A clínica se reserva o direito de modificar, suspender ou descontinuar qualquer aspecto do sistema
              a qualquer momento, sem aviso prévio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Rescisão</h2>
            <p>
              A clínica pode suspender ou encerrar seu acesso ao sistema a qualquer momento, sem aviso prévio,
              por violação destes Termos de Uso ou por qualquer outro motivo, a seu exclusivo critério.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Lei Aplicável</h2>
            <p>
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer disputa
              será resolvida no foro da comarca da sede da clínica.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Alterações nos Termos</h2>
            <p>
              Podemos modificar estes Termos de Uso a qualquer momento. As alterações entrarão em vigor
              imediatamente após sua publicação no sistema. O uso continuado do sistema após as alterações
              constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Contato</h2>
            <p>
              Para questões sobre estes Termos de Uso, entre em contato:
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

export default Terms;
