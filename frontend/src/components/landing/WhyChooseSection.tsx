
import { Award, Zap, Users, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const WhyChooseSection = () => {
  const benefits = [
    {
      icon: Award,
      title: 'Confiança Comprovada',
      description: 'Mais de 5 anos no mercado com 99,9% de uptime e certificações de segurança.'
    },
    {
      icon: Zap,
      title: 'Implementação Rápida',
      description: 'Configure sua clínica em menos de 30 minutos com nossa equipe de onboarding.'
    },
    {
      icon: Users,
      title: 'Suporte Especializado',
      description: 'Equipe dedicada com conhecimento em gestão de clínicas para te ajudar sempre.'
    },
    {
      icon: HeartHandshake,
      title: 'Sem Fidelidade',
      description: 'Cancele quando quiser. Acreditamos que você vai ficar porque somos realmente bons.'
    }
  ];

  return (
    <section className="py-20 bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Por que escolher o ClínicaAgenda?
          </h2>
          <p className="mt-4 text-xl text-blue-100 max-w-3xl mx-auto">
            Não somos apenas um software. Somos seu parceiro na transformação digital da sua clínica.
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
              Junte-se a mais de 1.000 clínicas que já transformaram seu atendimento
            </h3>
            <p className="text-blue-100 mb-6">
              Comece seu teste gratuito agora e veja como é fácil modernizar sua clínica
            </p>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg">
              Começar Teste Gratuito
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
