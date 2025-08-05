import { Sidebar } from '@/components/layout/Sidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Função para detectar se é tela xl+ (1280px+)
  const getInitialCollapsedState = () => {
    if (typeof window === 'undefined') return true; // SSR fallback
    return window.innerWidth < 1280; // Recolhido para telas < xl (1280px)
  };
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getInitialCollapsedState);

  // Detecta mudanças de tamanho da tela e ajusta o sidebar
  useEffect(() => {
    const handleResize = () => {
      const shouldCollapse = window.innerWidth < 1280;
      setIsSidebarCollapsed(shouldCollapse);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Extrai a rota atual para menu e submenu
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentPage = pathSegments.length >= 2
    ? `${pathSegments[0]}/${pathSegments[1]}`
    : (pathSegments[0] || 'dashboard');

  return (
    <div className="h-screen bg-gray-50 flex">
      <Sidebar
        currentPage={currentPage}
        onPageChange={(page) => navigate('/' + page)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <main
        className="flex-1 h-screen overflow-y-auto transition-all duration-200"
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Index;
