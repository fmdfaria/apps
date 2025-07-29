
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

export const PricingSection = () => {
  const plans = [
    {
      name: 'Gratuito',
      price: 'R$ 0',
      period: '/mês',
      description: 'Ideal para clínicas pequenas começando',
      features: [
        'Até 50 agendamentos/mês',
        'Cadastro básico de pacientes',
        'Lembretes por email',
        'Suporte por email',
        '1 profissional'
      ],
      buttonText: 'Começar Grátis',
      highlighted: false
    },
    {
      name: 'Profissional',
      price: 'R$ 97',
      period: '/mês',
      description: 'Para clínicas em crescimento',
      features: [
        'Agendamentos ilimitados',
        'Gestão completa de pacientes',
        'SMS + Email + WhatsApp',
        'Relatórios avançados',
        'Até 5 profissionais',
        'Agenda online personalizada',
        'Integração com calendários'
      ],
      buttonText: 'Teste Grátis',
      highlighted: true
    },
    {
      name: 'Empresarial',
      price: 'R$ 197',
      period: '/mês',
      description: 'Para clínicas e redes médicas',
      features: [
        'Tudo do plano Profissional',
        'Profissionais ilimitados',
        'Multi-unidades',
        'API personalizada',
        'Suporte prioritário 24/7',
        'Treinamento personalizado',
        'Backup automático',
        'Customizações avançadas'
      ],
      buttonText: 'Falar com Vendas',
      highlighted: false
    }
  ];

  return (
    <section id="precos" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Planos para cada tamanho de clínica
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Escolha o plano ideal e comece a transformar sua clínica hoje mesmo
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`rounded-xl p-8 ${
              plan.highlighted 
                ? 'bg-blue-600 text-white shadow-2xl scale-105' 
                : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
            }`}>
              {plan.highlighted && (
                <div className="text-center mb-4">
                  <span className="bg-yellow-400 text-blue-900 px-3 py-1 rounded-full text-sm font-semibold">
                    Mais Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={plan.highlighted ? 'text-blue-100' : 'text-gray-500'}>
                    {plan.period}
                  </span>
                </div>
                <p className={plan.highlighted ? 'text-blue-100' : 'text-gray-600'}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className={`w-5 h-5 mr-3 mt-0.5 ${
                      plan.highlighted ? 'text-blue-200' : 'text-green-500'
                    }`} />
                    <span className={plan.highlighted ? 'text-blue-50' : 'text-gray-700'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button className={`w-full ${
                plan.highlighted 
                  ? 'bg-white text-blue-600 hover:bg-blue-50' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
