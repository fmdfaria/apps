
import { Award, Zap, Users, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const WhyChooseSection = () => {
  const benefits = [
    {
      icon: Award,
      title: 'Excelência em Saúde Mental',
      description: 'Sistema especializado em atendimento clínicos.'
    },
    {
      icon: Zap,
      title: 'Agilidade no Atendimento',
      description: 'Agendamento rápido e organizado para otimizar o tempo dos profissionais.'
    },
    {
      icon: Users,
      title: 'Gestão de Equipe',
      description: 'Controle completo de profissionais, especialidades e disponibilidade.'
    },
    {
      icon: HeartHandshake,
      title: 'Cuidado com o Paciente',
      description: 'Sistema pensado para oferecer a melhor experiência ao paciente.'
    }
  ];

  return (
    <section id="sobre" className="py-20 bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Sobre a Clínica CelebraMente
          </h2>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Sistema completo de gestão da clínica.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <benefit.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
              <p className="text-blue-100 leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <div className="bg-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">
              Sistema CelebraMente
            </h3>
            <p className="text-blue-100 mb-6">
              Plataforma completa para gestão de consultas, prontuários e agendamentos
            </p>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg" onClick={() => window.location.href = '/auth/login'}>
              Acessar Sistema
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
