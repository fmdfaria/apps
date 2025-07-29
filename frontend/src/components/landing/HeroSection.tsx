
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section id="inicio" className="pt-20 pb-16 bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Transforme sua <span className="text-blue-600">clínica</span> com agendamento inteligente
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              Simplifique a gestão de agendamentos, pacientes e profissionais com nossa plataforma completa e fácil de usar.
            </p>
            <div className="mt-8">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                Comece agora grátis
              </Button>
              <p className="mt-3 text-sm text-gray-500">
                Teste grátis por 14 dias • Sem cartão de crédito
              </p>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <Calendar className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Agendamento Online</h3>
                    <p className="text-gray-600">Seus pacientes agendam 24/7</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                  <Users className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Gestão de Pacientes</h3>
                    <p className="text-gray-600">Histórico completo organizado</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-lg">
                  <Clock className="w-8 h-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Lembretes Automáticos</h3>
                    <p className="text-gray-600">Reduza faltas em até 80%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
