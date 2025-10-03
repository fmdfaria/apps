import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLogo } from '@/hooks/useLogo';

export const Header = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logoUrl, loading: logoLoading } = useLogo();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            {logoLoading ? (
              <div className="ml-2 h-14 w-36 bg-gray-200 animate-pulse rounded" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt="logo-probotec-clinica"
                className="ml-2 h-14 w-auto object-contain"
              />
            ) : (
              <div className="ml-2 h-14 w-36 bg-gray-100 flex items-center justify-center text-gray-500 text-sm rounded">
                Probotec Clínica
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#inicio" className="text-gray-700 hover:text-blue-600 transition-colors">Início</a>
            <a href="#funcionalidades" className="text-gray-700 hover:text-blue-600 transition-colors">Funcionalidades</a>
            <a href="#sobre" className="text-gray-700 hover:text-blue-600 transition-colors">Sobre</a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/auth/login')}>
              Login
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="#inicio" className="block px-3 py-2 text-gray-700 hover:text-blue-600">Início</a>
              <a href="#funcionalidades" className="block px-3 py-2 text-gray-700 hover:text-blue-600">Funcionalidades</a>
              <a href="#sobre" className="block px-3 py-2 text-gray-700 hover:text-blue-600">Sobre</a>
              <div className="px-3 py-2">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/auth/login')}>
                  Login
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
