import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, ClipboardCheck, Stethoscope, TrendingUp, Clock, FileText, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Clock,
      title: "Disponibilidade",
      description: "Consulte a sua disponibilidade na agenda",
      steps: [
        "Visualize horários livres e ocupados",
        "Configure bloqueios de agenda",
        "Defina intervalos personalizados"
      ],
      action: () => navigate('/profissionais/disponibilidade'),
      buttonText: "Gerenciar Disponibilidade"
    },
    {
      icon: Calendar,
      title: "Minha Agenda",
      description: "Agenda semanal personalizada por profissional",
      steps: [
        "Visualize todos seus agendamentos da semana",
        "Navegue entre diferentes semanas",
        "Veja detalhes de cada consulta"
      ],
      action: () => navigate('/agendamentos/calendario-profissional'),
      buttonText: "Ver Minha Agenda"
    },
    {
      icon: Stethoscope,
      title: "Atendimento",
      description: "Pacientes liberados para atendimento",
      steps: [
        "Veja lista de pacientes para hoje",
        "Inicie atendimentos confirmados",
        "Registre evoluções e observações"
      ],
      action: () => navigate('/agendamentos/atendimento'),
      buttonText: "Iniciar Atendimentos"
    },
    {
      icon: FileText,
      title: "Agendamentos",
      description: "Todos agendamentos em formato de tabela",
      steps: [
        "Visualize histórico completo",
        "Filtre por data e status",
        "Gerencie reagendamentos"
      ],
      action: () => navigate('/agendamentos'),
      buttonText: "Ver Agendamentos"
    }
  ];

  return (
    <div className="min-h-full">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-500 text-white rounded-b-3xl shadow-sm">
        <div className="absolute inset-0 opacity-20 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0, transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.25) 0, transparent 40%)' }}
        />
        <div className="relative px-6 py-10 sm:py-14 lg:px-10">
          <div className="max-w-6xl mx-auto text-center">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold leading-tight">
                Guia Rápido para
                <span className="block bg-white/90 bg-clip-text text-transparent">Profissionais</span>
              </h1>
              <p className="text-sm sm:text-base text-emerald-50/95 max-w-2xl mx-auto">
                Aprenda a usar todas as funcionalidades do sistema de forma rápida e eficiente.
                Siga este guia passo a passo para dominar sua rotina digital.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Training Sections */}
      <section className="px-6 lg:px-10 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Suas Funcionalidades Principais
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Conheça cada área do sistema e como utilizá-las para otimizar seu atendimento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <feature.icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                  <p className="text-gray-600">{feature.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <h4 className="font-medium text-gray-900">Como usar:</h4>
                    <ul className="space-y-2">
                      {feature.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button 
                    onClick={feature.action}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {feature.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start Guide */}
      <section className="px-6 lg:px-10 py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Rotina Diária Recomendada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-emerald-600 font-bold">1</span>
                  </div>
                  <h3 className="font-medium">Manhã</h3>
                  <p className="text-sm text-gray-600">Verifique sua agenda em "Minha Agenda"</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-emerald-600 font-bold">2</span>
                  </div>
                  <h3 className="font-medium">Início do Dia</h3>
                  <p className="text-sm text-gray-600">Acesse "Atendimento" para ver pacientes do dia</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-emerald-600 font-bold">3</span>
                  </div>
                  <h3 className="font-medium">Durante o Dia</h3>
                  <p className="text-sm text-gray-600">Realize atendimentos e registre evoluções</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-emerald-600 font-bold">4</span>
                  </div>
                  <h3 className="font-medium">Final do Dia</h3>
                  <p className="text-sm text-gray-600">Verifique as assinaturas e agendamentos do dia</p>
                </div>
              </div>
              <div className="mt-8 p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-800 text-center">
                  💡 <strong>Dica:</strong> Use o menu lateral para navegar rapidamente entre as funcionalidades durante seu dia de trabalho.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;


