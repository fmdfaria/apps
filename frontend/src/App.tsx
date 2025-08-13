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
import { useFavicon } from '@/hooks/useFavicon';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { OcupacaoPage } from '@/pages/dashboard/OcupacaoPage';
import { PedidosMedicosPage } from '@/pages/dashboard/PedidosMedicosPage';
import { ProfissionaisPage } from '@/pages/profissionais/ProfissionaisPage';
import DisponibilidadeProfissionaisPage from '@/pages/profissionais/DisponibilidadeProfissionaisPage';
import { PacientesPage } from '@/pages/pacientes/PacientesPage';
import { ServicosPage } from '@/pages/servicos/ServicosPage';
import PrecosServicoProfissionalPage from '@/pages/servicos/PrecosServicoProfissionalPage';
import { ConveniosPage } from '@/pages/convenios/ConveniosPage';
import { EspecialidadesPage } from '@/pages/especialidades/EspecialidadesPage';
import { ConselhosPage } from '@/pages/conselhos/ConselhosPage';
import { BancosPage } from '@/pages/bancos/BancosPage';
import { AgendamentosPage } from '@/pages/agendamentos/AgendamentosPage';
import { LiberarPage } from '@/pages/agendamentos/LiberarPage';
import { AtenderPage } from '@/pages/agendamentos/AtenderPage';
import { AprovarPage } from '@/pages/agendamentos/AprovarPage';
import { CalendarioPage } from '@/pages/agendamentos/CalendarioPage';
import PrecosParticularPage from '@/pages/pacientes/PrecosParticularPage';
import { Perfil } from '@/pages/perfil/Perfil';
import { RecursosPage } from './pages/recursos/RecursosPage';
import { UsuariosPage } from './pages/usuarios/UsuariosPage';
import RolesPage from './pages/admin/RolesPage';
import RoutesPage from './pages/admin/RoutesPage';
import UserRolesPage from './pages/admin/UserRolesPage';
import PermissionsPage from './pages/admin/PermissionsPage';
import EvolucaoPacientesPage from '@/pages/pacientes/EvolucaoPacientesPage';

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  
  // Inicializar favicon dinâmico
  useFavicon();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

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
            <Route path="dashboard/ocupacao" element={<OcupacaoPage />} />
            <Route path="dashboard/pedidos-medicos" element={<PedidosMedicosPage />} />
            <Route path="profissionais" element={<ProfissionaisPage />} />
            <Route path="profissionais/disponibilidade" element={<DisponibilidadeProfissionaisPage />} />
            <Route path="pacientes" element={<PacientesPage />} />
            <Route path="pacientes/precos-particulares" element={<PrecosParticularPage />} />
            <Route path="pacientes/evolucoes/:id" element={<EvolucaoPacientesPage />} />
            <Route path="servicos" element={<ServicosPage />} />
            <Route path="servicos/precos-profissionais" element={<PrecosServicoProfissionalPage />} />
            <Route path="convenios" element={<ConveniosPage />} />
            <Route path="especialidades" element={<EspecialidadesPage />} />
            <Route path="conselhos" element={<ConselhosPage />} />
            <Route path="bancos" element={<BancosPage />} />
            <Route path="recursos" element={<RecursosPage />} />
            <Route path="agendamentos" element={<AgendamentosPage />} />
            <Route path="agendamentos/liberacao" element={<LiberarPage />} />
            <Route path="agendamentos/atendimento" element={<AtenderPage />} />
            <Route path="agendamentos/conclusao" element={<AprovarPage />} />
            <Route path="calendario" element={<CalendarioPage />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="administracao/usuarios" element={<UsuariosPage />} />
            <Route path="administracao/roles" element={<RolesPage />} />
            <Route path="administracao/rotas" element={<RoutesPage />} />
            <Route path="administracao/usuarios-roles" element={<UserRolesPage />} />
            <Route path="administracao/permissoes" element={<PermissionsPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SonnerToaster />
    </BrowserRouter>
  );
}
