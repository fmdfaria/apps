import { Sidebar } from '@/components/layout/Sidebar';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
