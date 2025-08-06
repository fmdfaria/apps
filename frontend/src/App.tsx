import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/auth/Login';
import Logout from '@/pages/auth/Logout';
import PasswordResetRequest from '@/pages/auth/PasswordResetRequest';
import PasswordReset from '@/pages/auth/PasswordReset';
import EmailConfirmation from '@/pages/auth/EmailConfirmation';
import PrivateRoute from '@/components/layout/PrivateRoute';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import Landing from '@/pages/Landing';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth';
import { Toaster } from '@/components/ui/toaster';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import ProfissionaisPage from '@/pages/profissionais/ProfissionaisPage';
import { ProfissionaisPageResponsive } from '@/pages/profissionais/ProfissionaisPageResponsive';
import DisponibilidadeProfissionaisPage from '@/pages/profissionais/DisponibilidadeProfissionaisPage';
import { PacientesPage } from '@/pages/pacientes/PacientesPage';
import { PacientesPageResponsive } from '@/pages/pacientes/PacientesPageResponsive';
import { ServicosPage } from '@/pages/servicos/ServicosPage';
import { ServicosPageResponsive } from '@/pages/servicos/ServicosPageResponsive';
import PrecosServicoProfissionalPage from '@/pages/servicos/PrecosServicoProfissionalPage';
import { ConveniosPage } from '@/pages/convenios/ConveniosPage';
import { ConveniosPageResponsive } from '@/pages/convenios/ConveniosPageResponsive';
import { EspecialidadesPage } from '@/pages/especialidades/EspecialidadesPage';
import { ConselhosPage } from '@/pages/conselhos/ConselhosPage';
import { BancosPage } from '@/pages/bancos/BancosPage';
import { BancosPageResponsive } from '@/pages/bancos/BancosPageResponsive';
import { RecursosPage } from '@/pages/recursos/RecursosPage';
import { AgendamentosPage } from '@/pages/agendamentos/AgendamentosPage';
import { LiberarPage } from '@/pages/agendamentos/LiberarPage';
import { AtenderPage } from '@/pages/agendamentos/AtenderPage';
import { AprovarPage } from '@/pages/agendamentos/AprovarPage';
import { CalendarioPage } from '@/pages/agendamentos/CalendarioPage';
import PrecosParticularPage from '@/pages/pacientes/PrecosParticularPage';
import { Perfil } from '@/pages/perfil/Perfil';
import { ConselhosPageResponsive } from './pages/conselhos/ConselhosPageResponsive';
import { RecursosPageResponsive } from './pages/recursos/RecursosPageResponsive';
import { EspecialidadesPageResponsive } from './pages/especialidades/EspecialidadesPageResponsive';
import { UsuariosPageResponsive } from './pages/usuarios/UsuariosPageResponsive';

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/logout" element={<Logout />} />
        <Route path="/auth/password-reset-request" element={<PasswordResetRequest />} />
        <Route path="/auth/password-reset" element={<PasswordReset />} />
        <Route path="/auth/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/" element={<Landing />} />

        {/* Rotas protegidas */}
        <Route element={<PrivateRoute />}> 
            <Route element={<Index />}> {/* Layout compartilhado com Sidebar */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profissionais" element={<ProfissionaisPageResponsive />} />
            <Route path="profissionais-antigo" element={<ProfissionaisPage />} />
            <Route path="profissionais/disponibilidade" element={<DisponibilidadeProfissionaisPage />} />
            <Route path="pacientes" element={<PacientesPageResponsive />} />
            <Route path="pacientes-antigo" element={<PacientesPage />} />
            <Route path="pacientes/precos-particulares" element={<PrecosParticularPage />} />
            <Route path="servicos" element={<ServicosPageResponsive />} />
            <Route path="servicos-antigo" element={<ServicosPage />} />
            <Route path="servicos/precos-profissionais" element={<PrecosServicoProfissionalPage />} />
            <Route path="convenios" element={<ConveniosPageResponsive />} />
            <Route path="convenios-antigos" element={<ConveniosPage />} />
            <Route path="especialidades" element={<EspecialidadesPageResponsive />} />
            <Route path="especialidades-antigas" element={<EspecialidadesPage />} />
            <Route path="conselhos" element={<ConselhosPageResponsive />} />
            <Route path="conselhos-antigos" element={<ConselhosPage />} />
            <Route path="bancos" element={<BancosPageResponsive />} />
            <Route path="bancos-antigos" element={<BancosPage />} />
            <Route path="recursos" element={<RecursosPageResponsive />} />
            <Route path="recursos-antigos" element={<RecursosPage />} />
            <Route path="agendamentos" element={<AgendamentosPage />} />
            <Route path="agendamentos/liberacao" element={<LiberarPage />} />
            <Route path="agendamentos/atendimento" element={<AtenderPage />} />
            <Route path="agendamentos/conclusao" element={<AprovarPage />} />
            <Route path="calendario" element={<CalendarioPage />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="administracao/usuarios" element={<UsuariosPageResponsive />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
