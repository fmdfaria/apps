
import { Calendar, Users, Bell, BarChart3, Shield, Smartphone } from 'lucide-react';

export const FeaturesSection = () => {
  const features = [
    {
      icon: Calendar,
      title: 'Agendamentos',
      description: 'Interface intuitiva para agendamentos de consultas, com sincronização automática.'
    },
    {
      icon: Users,
      title: 'Gestão de Pacientes',
      description: 'Cadastro completo com histórico médico, documentos e informações organizadas.'
    },
    {
      icon: Bell,
      title: 'Notificações Inteligentes',
      description: 'Lembretes automáticos por whatsapp para reduzir faltas e melhorar atendimento.'
    },
    {
      icon: BarChart3,
      title: 'Relatórios e Estatísticas',
      description: 'Dashboards completos com métricas de desempenho e análises.'
    },
    {
      icon: Shield,
      title: 'Segurança e Privacidade',
      description: 'Conformidade com LGPD e criptografia de dados para proteger informações sensíveis.'
    },
    {
      icon: Smartphone,
      title: 'Acesso Mobile',
      description: 'Aplicativo responsivo para gerenciar sua clínica de qualquer lugar.'
    }
  ];

  return (
    <section id="funcionalidades" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Funcionalidades do Sistema
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Gestão completa da clínica CelebraMente com foco em eficiência e cuidado com o paciente.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
