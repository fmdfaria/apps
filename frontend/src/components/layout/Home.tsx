import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Users, ClipboardCheck, Stethoscope, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-500 text-white rounded-b-3xl shadow-sm">
        <div className="absolute inset-0 opacity-20 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0, transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.25) 0, transparent 40%)' }}
        />
        <div className="relative px-6 py-10 sm:py-14 lg:px-10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-emerald-700/40 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold">
                <span>✨</span>
                <span>Bem-vindo(a) ao</span>
              </div>
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold leading-tight">
                Sistema de Gestão da Clínica
                <span className="block bg-white/90 bg-clip-text text-transparent">CelebraMente</span>
              </h1>
              <p className="text-sm sm:text-base text-emerald-50/95 max-w-xl">
                Centralize seus agendamentos, pacientes, atendimentos e faturamento em um só lugar.
                Agilidade para a equipe, excelência no atendimento.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button onClick={() => navigate('/agendamentos/atendimento')}
                        className="bg-white text-emerald-700 hover:bg-emerald-50">
                  <Stethoscope className="w-4 h-4 mr-2" /> Iniciar Atendimentos
                </Button>
                <Button variant="outline"
                        onClick={() => navigate('/calendario')}
                        className="border-white text-white hover:bg-emerald-600/30">
                  <Calendar className="w-4 h-4 mr-2" /> Minha Agenda
                </Button>
              </div>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>
      </section>

      {/* Nota para profissionais */}
      <section className="px-6 lg:px-10 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Para profissionais</h2>
              <p className="mt-2 text-sm text-gray-600">
                Use o menu lateral para acessar suas funcionalidades. Você pode iniciar seus atendimentos em "Atendimento" ou consultar sua agenda em "Calendário".
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Home;


