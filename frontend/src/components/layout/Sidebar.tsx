import React from 'react';
import { Calendar, Users, UserCheck, Briefcase, Building, Building2, LayoutDashboard, LogOut, ChevronLeft, ChevronRight, Clock, DollarSign, CheckCircle, Stethoscope, ClipboardCheck, User, Landmark, Settings, Shield, FileText, CreditCard, TrendingUp, TrendingDown, Tag, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModuleTheme } from '@/types/theme';
import { useMenuPermissions } from '@/hooks/useMenuPermissions';
import { useLogo } from '@/hooks/useLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/services/avatar';

// Mapeamento de páginas para módulos de tema
const pageToModuleMap: Record<string, string> = {
  'dashboard': 'default',
  'dashboard/pedidos-medicos': 'default',
  'calendario': 'agendamentos',
  'agendamentos/calendario-profissional': 'agendamentos',
  'agendamentos': 'agendamentos',
  'agendamentos/liberacao': 'agendamentos',
  'agendamentos/liberacao-particulares': 'agendamentos',
  'agendamentos/atendimento': 'agendamentos',
  'agendamentos/conclusao': 'agendamentos',
  'agendamentos/pendencias': 'agendamentos',
  'agendamentos/fechamento': 'agendamentos',
  'agendamentos/pagamentos': 'agendamentos',
  'pacientes': 'pacientes',
  'pacientes/precos-particulares': 'pacientes',
  'fila-de-espera': 'pacientes',
  'profissionais': 'profissionais',
  'profissionais/disponibilidade': 'profissionais',
  'servicos': 'servicos',
  'servicos/precos-profissionais': 'servicos',
  'convenios': 'convenios',
  'recursos': 'recursos',
  'especialidades': 'especialidades',
  'conselhos': 'conselhos',
  'bancos': 'bancos',
  'administracao': 'default',
  'administracao/usuarios': 'default',
  'administracao/roles': 'default',
  'administracao/rotas': 'default',
  'administracao/usuarios-roles': 'default',
  'administracao/permissoes': 'default',
  'configuracoes': 'default',
  'financeiro/empresas': 'financeiro',
  'financeiro/contas-bancarias': 'financeiro',
  'financeiro/contas-receber': 'financeiro',
  'financeiro/contas-pagar': 'financeiro',
  'financeiro/categorias-financeiras': 'financeiro',
  'financeiro/fluxo-caixa': 'financeiro'
};

// Componente de Tooltip para sidebar recolhido
const SidebarTooltip = ({ children, tooltip, module = 'default', onClick, isActive = false }: { 
  children: React.ReactNode; 
  tooltip: string; 
  module?: string;
  onClick: () => void;
  isActive?: boolean;
}) => {
  const theme = getModuleTheme(module);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hideTimeoutRef = useRef<NodeJS.Timeout>();
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detectar se é dispositivo touch
  React.useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouchDevice();
  }, []);

  const showTooltipNow = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({ top: rect.top + rect.height / 2 });
      setShowTooltip(true);
    }
  };

  const hideTooltipNow = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setShowTooltip(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    
    if (isTouchDevice) return; // Não usar hover em touch devices
    
    // Pequeno delay para evitar tooltips muito rápidos
    timeoutRef.current = setTimeout(showTooltipNow, 300);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    
    if (isTouchDevice) return; // Não usar hover em touch devices
    
    // Limpar timeout se sair antes do delay
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    hideTooltipNow();
  };

  const handleTouchStart = () => {
    if (!isTouchDevice) return;
    
    showTooltipNow();
    
    // Auto-hide após 2 segundos em touch
    hideTimeoutRef.current = setTimeout(hideTooltipNow, 2000);
  };

  const handleClick = () => {
    // Esconder tooltip imediatamente ao clicar
    hideTooltipNow();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Executar ação de clique
    onClick();
  };

  return (
    <>
      <div
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        className={cn(
          'w-full cursor-pointer flex items-center transition-colors justify-center py-2 px-0',
          module === 'default' && tooltip === 'Sair' ? 'rounded-md' : '', // Adiciona rounded para logout
          isActive 
            ? `bg-gradient-to-r ${theme.headerBg} border-r-2` 
            : isHovered
            ? module === 'default' && tooltip === 'Sair' 
              ? 'bg-red-50' 
              : `bg-gradient-to-r ${theme.hoverBg}`
            : 'text-gray-700'
        )}
      >
        {children}
      </div>
      
      {/* Tooltip posicionado */}
      {showTooltip && (
        <div 
          className={`fixed left-16 ml-2 px-3 py-2 bg-gradient-to-r ${theme.primaryButton} text-white text-sm rounded-md shadow-lg transition-all duration-200 pointer-events-none whitespace-nowrap z-[9999] opacity-95`}
          style={{
            top: tooltipPosition.top,
            transform: 'translateY(-50%)'
          }}
        >
          {tooltip}
          {/* Seta do tooltip com cor do tema */}
          <div className={`absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent`}
               style={{
                 borderRightColor: theme.primaryButton.includes('blue') ? '#3b82f6' : 
                                  theme.primaryButton.includes('green') ? '#10b981' : 
                                  theme.primaryButton.includes('rose') ? '#f43f5e' : 
                                  theme.primaryButton.includes('purple') ? '#8b5cf6' :
                                  theme.primaryButton.includes('orange') ? '#f97316' :
                                  theme.primaryButton.includes('teal') ? '#14b8a6' : '#6b7280'
               }}
          />
        </div>
      )}
    </>
  );
};

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'dashboard/pedidos-medicos', label: 'Pedidos Médicos', icon: FileText },
  { id: 'calendario', label: 'Calendário', icon: Calendar },
  { id: 'agendamentos/calendario-profissional', label: 'Minha Agenda', icon: User },
  { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
  { id: 'agendamentos/liberacao', label: 'Liberação', icon: CheckCircle },
  { id: 'agendamentos/liberacao-particulares', label: 'Liberação Particulares', icon: CheckCircle },
  { id: 'agendamentos/atendimento', label: 'Atendimento', icon: Stethoscope },
  { id: 'agendamentos/conclusao', label: 'Conclusão', icon: ClipboardCheck },
  { id: 'agendamentos/pendencias', label: 'Pendências', icon: ClipboardCheck },
  { id: 'agendamentos/fechamento', label: 'Fechamento', icon: DollarSign },
  { id: 'agendamentos/pagamentos', label: 'Pagamentos', icon: DollarSign },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'pacientes/precos-particulares', label: 'Preços Particulares', icon: DollarSign },
  { id: 'fila-de-espera', label: 'Fila de Espera', icon: Clock },
  { id: 'profissionais', label: 'Profissionais', icon: UserCheck },
  { id: 'profissionais/disponibilidade', label: 'Disponibilidades', icon: Clock },
  { id: 'servicos', label: 'Serviços', icon: Briefcase },
  { id: 'servicos/precos-profissionais', label: 'Preços Profissionais', icon: DollarSign },
  { id: 'convenios', label: 'Convênios', icon: Building },
  { id: 'recursos', label: 'Recursos', icon: Building2 },
  { id: 'especialidades', label: 'Especialidades', icon: Briefcase },
  { id: 'conselhos', label: 'Conselhos Profissionais', icon: Building },
  { id: 'bancos', label: 'Bancos', icon: Landmark },
  { id: 'administracao/usuarios', label: 'Usuários', icon: Users },
  { id: 'administracao/roles', label: 'Roles', icon: Shield },
  { id: 'administracao/rotas', label: 'Rotas', icon: Building },
  { id: 'administracao/usuarios-roles', label: 'Usuários e Roles', icon: UserCheck },
  { id: 'administracao/permissoes', label: 'Permissões', icon: Settings },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
  { id: 'financeiro/empresas', label: 'Empresas', icon: Building2 },
  { id: 'financeiro/contas-bancarias', label: 'Contas Bancárias', icon: Landmark },
  { id: 'financeiro/contas-receber', label: 'Contas a Receber', icon: TrendingUp },
  { id: 'financeiro/contas-pagar', label: 'Contas a Pagar', icon: TrendingDown },
  { id: 'financeiro/categorias-financeiras', label: 'Categorias Financeiras', icon: Tag },
  { id: 'financeiro/fluxo-caixa', label: 'Fluxo de Caixa', icon: Banknote }
];

export const Sidebar = ({ currentPage, onPageChange, isCollapsed: isCollapsedProp, setIsCollapsed: setIsCollapsedProp }: SidebarProps) => {
  const { logout, user, setUser } = useAuth();
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = isCollapsedProp !== undefined ? isCollapsedProp : internalCollapsed;
  const setIsCollapsed = setIsCollapsedProp || setInternalCollapsed;
  const { hasPermission, loading: permissionsLoading } = useMenuPermissions();
  const { logoUrl, loading: logoLoading } = useLogo();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || null);
    let mounted = true;
    
    // Só buscar avatar se:
    // 1. Usuário existe
    // 2. Tem alguma indicação de avatar (não é null/undefined/empty)
    // 3. Não está no cache válido
    if (user) {
      // Verificar cache primeiro
      const cachedUrl = localStorage.getItem('avatar_url_cache') || '';
      const cachedExp = Number(localStorage.getItem('avatar_url_cache_exp') || 0);
      const now = Date.now();
      
      if (cachedUrl && cachedExp && now < cachedExp) {
        // Usar cache válido
        if (mounted) setAvatarUrl(cachedUrl);
        return;
      }
      
      // Se o usuário tem alguma indicação de avatar, buscar URL atualizada
      // Isso pode ser um S3 key, URL antiga, ou qualquer string não-vazia
      if (user.avatarUrl && user.avatarUrl.trim()) {
        getAvatarUrl()
          .then((url) => { 
            if (mounted) {
              setAvatarUrl(url);
              // Atualizar o usuário no contexto com a nova URL presignada
              if (user && url !== user.avatarUrl && setUser) {
                const updatedUser = { ...user, avatarUrl: url || undefined };
                setUser(updatedUser);
              }
            }
          })
          .catch((error) => {
            // Log apenas erros que não sejam 404 (404 é tratado pelo serviço)
            if (error?.response?.status !== 404) {
              console.warn('Erro ao carregar avatar:', error);
            }
            // Se falhar, manter o avatar de iniciais
            if (mounted) setAvatarUrl(null);
          });
      } else {
        // Usuário não tem avatar configurado, usar iniciais
        if (mounted) setAvatarUrl(null);
      }
    }
    return () => { mounted = false; };
  }, [user?.id, user?.avatarUrl]); // Adicionar user?.avatarUrl como dependência
  const handleToggle = () => {
    if (setIsCollapsedProp) {
      setIsCollapsed(!isCollapsed);
    } else {
      setInternalCollapsed(prev => !prev);
    }
  };

  // Função para gerar iniciais do nome
  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Função para obter cor do badge baseado nas roles do usuário
  const getUserRoleColor = (roles: string[] | undefined) => {
    if (!roles || !Array.isArray(roles)) return 'bg-gray-500';
    if (roles.includes('ADMIN')) return 'bg-red-500';
    if (roles.includes('RECEPCIONISTA')) return 'bg-blue-500';
    if (roles.includes('PROFISSIONAL')) return 'bg-green-500';
    if (roles.includes('PACIENTE')) return 'bg-purple-500';
    return 'bg-gray-500';
  };
  return (
    <div className={cn(
      'bg-white shadow-lg border-r border-gray-200 flex flex-col h-screen transition-all duration-200 relative',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className={cn('flex items-center border-b border-gray-200', isCollapsed ? 'justify-center p-2' : 'justify-between p-4')}> 
        {logoLoading ? (
          <div className={cn('h-10 w-24 bg-gray-200 animate-pulse rounded transition-all duration-200', isCollapsed ? 'hidden' : 'block')} />
        ) : logoUrl ? (
          <button onClick={() => navigate('/home')} title="Ir para Home">
            <img 
              src={logoUrl} 
              alt="Probotec Logo" 
              className={cn('h-10 w-auto transition-all duration-200', isCollapsed ? 'hidden' : 'block')}
            />
          </button>
        ) : (
          <button onClick={() => navigate('/home')} title="Ir para Home"
                  className={cn('h-10 w-24 bg-gray-100 flex items-center justify-center text-gray-500 text-xs rounded transition-all duration-200', isCollapsed ? 'hidden' : 'block')}>
            Logo
          </button>
        )}
        <button
          onClick={handleToggle}
          className="p-2 rounded hover:bg-blue-50 transition-colors"
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Seção de Profile do Usuário */}
      {user && (
        <div className={cn('border-b border-gray-100', isCollapsed ? 'p-2' : 'p-4')}>
          {isCollapsed ? (
            /* Versão colapsada - avatar clicável centralizado */
            <div className="flex justify-center">
              <button 
                className={cn(
                  'rounded-full cursor-pointer hover:opacity-90 transition-opacity'
                )}
                title={`${user.nome} - Clique para ver perfil`}
                onClick={() => navigate('/perfil')}
              >
                <Avatar className="w-8 h-8">
                  {(user.avatarUrl || avatarUrl) ? (
                    <AvatarImage src={(user.avatarUrl || avatarUrl) as string} alt={user.nome} />
                  ) : null}
                  <AvatarFallback 
                    className={cn(
                      'text-white text-sm font-semibold',
                      getUserRoleColor(user.roles || [])
                    )}
                  >
                    {getInitials(user.nome)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          ) : (
            /* Versão expandida - avatar à esquerda */
            <div className="flex gap-3 items-start">
              {/* Coluna esquerda: Avatar clicável */}
              <div className="flex-shrink-0">
                <button 
                  className={cn(
                    'rounded-full cursor-pointer hover:opacity-90 transition-opacity'
                  )}
                  title="Ver perfil"
                  onClick={() => navigate('/perfil')}
                >
                  <Avatar className="w-10 h-10">
                    {(user.avatarUrl || avatarUrl) ? (
                      <AvatarImage src={(user.avatarUrl || avatarUrl) as string} alt={user.nome} />
                    ) : null}
                    <AvatarFallback 
                      className={cn(
                        'text-white text-sm font-semibold',
                        getUserRoleColor(user.roles || [])
                      )}
                    >
                      {getInitials(user.nome)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </div>
              
              {/* Coluna direita: Informações do usuário */}
              <div className="flex-1 min-w-0">
                {/* Linha 1: Nome */}
                <p className="text-sm font-medium text-gray-900 truncate mb-1">
                  {user.nome}
                </p>
                
                {/* Linha 2: Email */}
                <p className="text-xs text-gray-500 truncate" title={user.email}>
                  {user.email}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      <nav className="mt-4 flex-1 overflow-y-auto overflow-x-visible">
        {permissionsLoading ? (
          /* Skeleton loading para o menu */
          <div className="space-y-2 px-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded-md"></div>
              </div>
            ))}
          </div>
        ) : (
          menuItems
            .filter((item) => {
              // Para todos os itens, verificar permissão direta
              const permission = hasPermission(item.id);
              if (item.id === 'financeiro/contas-bancarias') {
                console.log('🏦 Sidebar - Verificando permissão para contas bancárias:', permission);
              }
              return permission;
            })
            .map((item) => {
              const Icon = item.icon;
              const itemModule = pageToModuleMap[item.id] || 'default';
              const itemTheme = getModuleTheme(itemModule);
              const isActive = currentPage === item.id;
              
              return (
              <div key={item.id}>
                {isCollapsed ? (
                  <SidebarTooltip 
                    tooltip={item.label} 
                    module={itemModule}
                    onClick={() => onPageChange(item.id)}
                    isActive={isActive}
                  >
                    {Icon && (
                      <Icon 
                        className={cn(
                          "w-5 h-5 mr-0",
                          isActive ? `text-${itemModule === 'servicos' ? 'green' : itemModule === 'agendamentos' ? 'blue' : itemModule === 'pacientes' ? 'rose' : 'gray'}-600` : 'text-gray-700'
                        )}
                      />
                    )}
                  </SidebarTooltip>
                ) : (
                  <button
                    onClick={() => onPageChange(item.id)}
                    className={cn(
                      'flex items-center transition-colors',
                      'w-full px-4 py-2 text-left',
                      isActive 
                        ? `bg-gradient-to-r ${itemTheme.headerBg} border-r-2` 
                        : `text-gray-700 hover:bg-gradient-to-r ${itemTheme.hoverBg}`
                    )}
                  >
                    {Icon && (
                      <Icon 
                        className={cn(
                          "w-5 h-5 mr-0",
                          isActive ? `text-${itemModule === 'servicos' ? 'green' : itemModule === 'agendamentos' ? 'blue' : itemModule === 'pacientes' ? 'rose' : 'gray'}-600` : 'text-gray-700'
                        )}
                      />
                    )}
                    <span 
                      className={cn(
                        "ml-3",
                        isActive ? `text-${itemModule === 'servicos' ? 'green' : itemModule === 'agendamentos' ? 'blue' : itemModule === 'pacientes' ? 'rose' : 'gray'}-600` : 'text-gray-700'
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </nav>
      <div className={cn('border-t border-gray-200 flex-shrink-0', isCollapsed ? 'py-3 px-2' : 'py-3 px-4')}>
        {isCollapsed ? (
          <SidebarTooltip 
            tooltip="Sair" 
            module="default"
            onClick={logout}
            isActive={false}
          >
            <LogOut className="w-5 h-5 mr-0 text-red-600" />
          </SidebarTooltip>
        ) : (
          <button
            onClick={logout}
            className="flex items-center transition-colors rounded-md w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5 mr-0 text-red-600" />
            <span className="ml-3 text-red-600">Sair</span>
          </button>
        )}
      </div>
    </div>
  );
};
