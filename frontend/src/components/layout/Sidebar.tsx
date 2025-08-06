import React from 'react';
import { Calendar, Users, UserCheck, Briefcase, Building, Building2, LayoutDashboard, LogOut, ChevronLeft, ChevronRight, Clock, DollarSign, CheckCircle, Stethoscope, ClipboardCheck, User, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModuleTheme } from '@/types/theme';

// Mapeamento de páginas para módulos de tema
const pageToModuleMap: Record<string, string> = {
  'dashboard': 'default',
  'calendario': 'agendamentos',
  'agendamentos': 'agendamentos',
  'agendamentos/liberacao': 'agendamentos',
  'agendamentos/atendimento': 'agendamentos',
  'agendamentos/conclusao': 'agendamentos',
  'pacientes': 'pacientes',
  'pacientes/precos-particulares': 'pacientes',
  'profissionais': 'profissionais',
  'profissionais/disponibilidade': 'profissionais',
  'servicos': 'servicos',
  'servicos/precos-profissionais': 'servicos',
  'convenios': 'convenios',
  'recursos': 'recursos',
  'especialidades': 'especialidades',
  'conselhos': 'conselhos',
  'bancos': 'default'
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
  { id: 'calendario', label: 'Calendário', icon: Calendar },
  {
    id: 'agendamentos',
    label: 'Agendamentos',
    icon: Calendar,
    children: [
        { id: 'agendamentos/liberacao', label: 'Liberação', icon: CheckCircle },
        { id: 'agendamentos/atendimento', label: 'Atendimento', icon: Stethoscope },
        { id: 'agendamentos/conclusao', label: 'Conclusão', icon: ClipboardCheck }
    ]
  },
  {
    id: 'pacientes',
    label: 'Pacientes',
    icon: Users,
    children: [
      { id: 'pacientes/precos-particulares', label: 'Preços Particulares', icon: DollarSign }
    ]
  },
  {
    id: 'profissionais', 
    label: 'Profissionais', 
    icon: UserCheck,
    children: [
      { id: 'profissionais/disponibilidade', label: 'Disponibilidades', icon: Clock }
    ]
  },
  {
    id: 'servicos',
    label: 'Serviços',
    icon: Briefcase,
    children: [
      { id: 'servicos/precos-profissionais', label: 'Preços Profissionais', icon: DollarSign }
    ]
  },
  { id: 'convenios', label: 'Convênios', icon: Building },
  { id: 'recursos', label: 'Recursos', icon: Building2 },
  { id: 'especialidades', label: 'Especialidades', icon: Briefcase },
  { id: 'conselhos', label: 'Conselhos Profissionais', icon: Building },
  { id: 'bancos', label: 'Bancos', icon: Landmark },
];

export const Sidebar = ({ currentPage, onPageChange, isCollapsed: isCollapsedProp, setIsCollapsed: setIsCollapsedProp }: SidebarProps) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = isCollapsedProp !== undefined ? isCollapsedProp : internalCollapsed;
  const setIsCollapsed = setIsCollapsedProp || setInternalCollapsed;
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

  // Função para obter cor do badge baseado no tipo de usuário
  const getUserTypeColor = (tipo: string) => {
    const colors = {
      'ADMIN': 'bg-red-500',
      'RECEPCIONISTA': 'bg-blue-500',
      'PROFISSIONAL': 'bg-green-500',
      'PACIENTE': 'bg-purple-500'
    };
    return colors[tipo as keyof typeof colors] || 'bg-gray-500';
  };

  // Função para obter texto amigável do tipo de usuário
  const getUserTypeLabel = (tipo: string) => {
    const labels = {
      'ADMIN': 'Administrador',
      'RECEPCIONISTA': 'Recepcionista',
      'PROFISSIONAL': 'Profissional',
      'PACIENTE': 'Paciente'
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };
  return (
    <div className={cn(
      'bg-white shadow-lg border-r border-gray-200 flex flex-col h-screen transition-all duration-200 relative',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className={cn('flex items-center border-b border-gray-200', isCollapsed ? 'justify-center p-2' : 'justify-between p-4')}> 
        <img 
          src="https://hfhtedjjznbktrnshmwa.supabase.co/storage/v1/object/public/files//logo-probotec-300x100.png" 
          alt="Probotec Logo" 
          className={cn('h-10 w-auto transition-all duration-200', isCollapsed ? 'hidden' : 'block')}
        />
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
                  'flex items-center justify-center rounded-full text-white font-semibold text-sm w-8 h-8 cursor-pointer hover:opacity-90 transition-opacity',
                  getUserTypeColor(user.tipo)
                )}
                title={`${user.nome} - Clique para ver perfil`}
                onClick={() => navigate('/perfil')}
              >
                {getInitials(user.nome)}
              </button>
            </div>
          ) : (
            /* Versão expandida - avatar à esquerda */
            <div className="flex gap-3 items-start">
              {/* Coluna esquerda: Avatar clicável */}
              <div className="flex-shrink-0">
                <button 
                  className={cn(
                    'flex items-center justify-center rounded-full text-white font-semibold text-sm w-10 h-10 cursor-pointer hover:opacity-90 transition-opacity',
                    getUserTypeColor(user.tipo)
                  )}
                  title="Ver perfil"
                  onClick={() => navigate('/perfil')}
                >
                  {getInitials(user.nome)}
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
        {menuItems
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
                {/* Submenu */}
                {item.children && !isCollapsed && (
                  <div className="ml-8">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <button
                          key={child.id}
                          onClick={() => onPageChange(child.id)}
                          className={cn(
                            'w-full flex items-center px-3 py-1.5 text-left text-sm rounded transition-colors hover:bg-blue-50',
                            currentPage === child.id
                              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                              : 'text-gray-600 hover:text-blue-700'
                          )}
                        >
                          {ChildIcon && <ChildIcon className="w-4 h-4 mr-2" />}
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
