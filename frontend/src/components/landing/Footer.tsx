
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { useLogo } from '@/hooks/useLogo';

export const Footer = () => {
  const { logoUrl, loading: logoLoading } = useLogo();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Logo e Descrição */}
          <div>
            <div className="flex items-center mb-4">
              {logoLoading ? (
                <div className="h-20 w-48 bg-gray-700 animate-pulse rounded" />
              ) : logoUrl ? (
                <img
                  src={logoUrl}
                  alt="logo-probotec-clinica"
                  className="h-20 w-auto object-contain"
                />
              ) : (
                <div className="h-20 w-48 bg-gray-800 flex items-center justify-center text-gray-400 text-base rounded">
                  CelebraMente
                </div>
              )}
            </div>
            <p className="text-gray-400 mb-6">
              Sistema de gestão completo para clínicas de saúde mental.
            </p>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-semibold text-lg mb-6">Contato</h3>
            <div className="space-y-4">
              <div className="flex items-center text-gray-400">
                <Mail className="w-5 h-5 mr-3" />
                <span>contato@celebramente.com.br</span>
              </div>
              <div className="flex items-center text-gray-400">
                <Phone className="w-5 h-5 mr-3" />
                <span>+55 12 98259-2409</span>
              </div>
              <div className="flex items-start text-gray-400">
                <MapPin className="w-5 h-5 mr-3 mt-1" />
                <span>Clínica CelebraMente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Linha separadora */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="lg:flex lg:justify-between lg:items-center">
            <div className="text-gray-400 text-sm">
              © 2025 Clínica CelebraMente. Todos os direitos reservados.
            </div>
            <div className="mt-4 lg:mt-0">
              <ul className="flex flex-wrap space-x-6 text-sm text-gray-400">
                <li><a href="/privacidade" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="/termos" className="hover:text-white transition-colors">Termos</a></li>
                <li><a href="/cookies" className="hover:text-white transition-colors">Cookies</a></li>
                <li><a href="/lgpd" className="hover:text-white transition-colors">LGPD</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
