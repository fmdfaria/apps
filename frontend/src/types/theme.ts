// Definição de temas para cada módulo da aplicação

export interface ModuleTheme {
  // Gradientes para títulos
  titleGradient: string;
  
  // Gradientes para backgrounds
  headerBg: string;
  hoverBg: string;
  
  // Cores para botões de ação
  primaryButton: string;
  primaryButtonHover: string;
  
  // Cores para focus rings
  focusRing: string;
  
  // Cores para texto em hover
  hoverTextColor: string;
}

// Temas predefinidos para cada módulo
export const moduleThemes: Record<string, ModuleTheme> = {
  agendamentos: {
    titleGradient: 'from-blue-600 to-indigo-600',
    headerBg: 'from-blue-50 to-indigo-50',
    hoverBg: 'hover:from-blue-50 hover:to-indigo-50',
    primaryButton: 'from-blue-600 to-blue-700',
    primaryButtonHover: 'hover:from-blue-700 hover:to-blue-800',
    focusRing: 'focus:ring-blue-300',
    hoverTextColor: 'hover:text-blue-700'
  },
  
  servicos: {
    titleGradient: 'from-green-600 to-emerald-600',
    headerBg: 'from-green-50 to-emerald-50',
    hoverBg: 'hover:from-green-50 hover:to-emerald-50',
    primaryButton: 'from-green-600 to-green-700',
    primaryButtonHover: 'hover:from-green-700 hover:to-green-800',
    focusRing: 'focus:ring-green-300',
    hoverTextColor: 'hover:text-green-700'
  },
  
  convenios: {
    titleGradient: 'from-purple-600 to-pink-600',
    headerBg: 'from-purple-50 to-pink-50',
    hoverBg: 'hover:from-purple-50 hover:to-pink-50',
    primaryButton: 'from-purple-600 to-purple-700',
    primaryButtonHover: 'hover:from-purple-700 hover:to-purple-800',
    focusRing: 'focus:ring-purple-300',
    hoverTextColor: 'hover:text-purple-700'
  },
  
  recursos: {
    titleGradient: 'from-orange-600 to-red-600',
    headerBg: 'from-orange-50 to-red-50',
    hoverBg: 'hover:from-orange-50 hover:to-red-50',
    primaryButton: 'from-orange-600 to-orange-700',
    primaryButtonHover: 'hover:from-orange-700 hover:to-orange-800',
    focusRing: 'focus:ring-orange-300',
    hoverTextColor: 'hover:text-orange-700'
  },
  
  especialidades: {
    titleGradient: 'from-indigo-600 to-blue-600',
    headerBg: 'from-indigo-50 to-blue-50',
    hoverBg: 'hover:from-indigo-50 hover:to-blue-50',
    primaryButton: 'from-indigo-600 to-indigo-700',
    primaryButtonHover: 'hover:from-indigo-700 hover:to-indigo-800',
    focusRing: 'focus:ring-indigo-300',
    hoverTextColor: 'hover:text-indigo-700'
  },
  
  conselhos: {
    titleGradient: 'from-teal-600 to-cyan-600',
    headerBg: 'from-teal-50 to-cyan-50',
    hoverBg: 'hover:from-teal-50 hover:to-cyan-50',
    primaryButton: 'from-teal-600 to-teal-700',
    primaryButtonHover: 'hover:from-teal-700 hover:to-teal-800',
    focusRing: 'focus:ring-teal-300',
    hoverTextColor: 'hover:text-teal-700'
  },
  
  profissionais: {
    titleGradient: 'from-violet-600 to-purple-600',
    headerBg: 'from-violet-50 to-purple-50',
    hoverBg: 'hover:from-violet-50 hover:to-purple-50',
    primaryButton: 'from-violet-600 to-violet-700',
    primaryButtonHover: 'hover:from-violet-700 hover:to-violet-800',
    focusRing: 'focus:ring-violet-300',
    hoverTextColor: 'hover:text-violet-700'
  },
  
  pacientes: {
    titleGradient: 'from-rose-600 to-pink-600',
    headerBg: 'from-rose-50 to-pink-50',
    hoverBg: 'hover:from-rose-50 hover:to-pink-50',
    primaryButton: 'from-rose-600 to-rose-700',
    primaryButtonHover: 'hover:from-rose-700 hover:to-rose-800',
    focusRing: 'focus:ring-rose-300',
    hoverTextColor: 'hover:text-rose-700'
  },
  
  bancos: {
    titleGradient: 'from-emerald-600 to-teal-600',
    headerBg: 'from-emerald-50 to-teal-50',
    hoverBg: 'hover:from-emerald-50 hover:to-teal-50',
    primaryButton: 'from-emerald-600 to-emerald-700',
    primaryButtonHover: 'hover:from-emerald-700 hover:to-emerald-800',
    focusRing: 'focus:ring-emerald-300',
    hoverTextColor: 'hover:text-emerald-700'
  },
  
  admin: {
    titleGradient: 'from-slate-600 to-gray-800',
    headerBg: 'from-slate-50 to-gray-100',
    hoverBg: 'hover:from-slate-50 hover:to-gray-100',
    primaryButton: 'from-slate-600 to-slate-700',
    primaryButtonHover: 'hover:from-slate-700 hover:to-slate-800',
    focusRing: 'focus:ring-slate-300',
    hoverTextColor: 'hover:text-slate-700'
  },
  
  roles: {
    titleGradient: 'from-amber-600 to-orange-600',
    headerBg: 'from-amber-50 to-orange-50',
    hoverBg: 'hover:from-amber-50 hover:to-orange-50',
    primaryButton: 'from-amber-600 to-amber-700',
    primaryButtonHover: 'hover:from-amber-700 hover:to-amber-800',
    focusRing: 'focus:ring-amber-300',
    hoverTextColor: 'hover:text-amber-700'
  },
  
  routes: {
    titleGradient: 'from-sky-600 to-blue-600',
    headerBg: 'from-sky-50 to-blue-50',
    hoverBg: 'hover:from-sky-50 hover:to-blue-50',
    primaryButton: 'from-sky-600 to-sky-700',
    primaryButtonHover: 'hover:from-sky-700 hover:to-sky-800',
    focusRing: 'focus:ring-sky-300',
    hoverTextColor: 'hover:text-sky-700'
  },
  
  permissions: {
    titleGradient: 'from-red-600 to-rose-600',
    headerBg: 'from-red-50 to-rose-50',
    hoverBg: 'hover:from-red-50 hover:to-rose-50',
    primaryButton: 'from-red-600 to-red-700',
    primaryButtonHover: 'hover:from-red-700 hover:to-red-800',
    focusRing: 'focus:ring-red-300',
    hoverTextColor: 'hover:text-red-700'
  },
  
  calendario: {
    titleGradient: 'from-cyan-600 to-blue-600',
    headerBg: 'from-cyan-50 to-blue-50',
    hoverBg: 'hover:from-cyan-50 hover:to-blue-50',
    primaryButton: 'from-cyan-600 to-cyan-700',
    primaryButtonHover: 'hover:from-cyan-700 hover:to-cyan-800',
    focusRing: 'focus:ring-cyan-300',
    hoverTextColor: 'hover:text-cyan-700'
  },
  
  // Tema padrão (fallback)
  default: {
    titleGradient: 'from-gray-600 to-gray-800',
    headerBg: 'from-gray-50 to-gray-100',
    hoverBg: 'hover:from-gray-50 hover:to-gray-100',
    primaryButton: 'from-gray-600 to-gray-700',
    primaryButtonHover: 'hover:from-gray-700 hover:to-gray-800',
    focusRing: 'focus:ring-gray-300',
    hoverTextColor: 'hover:text-gray-700'
  }
};

// Função helper para obter tema do módulo
export const getModuleTheme = (moduleName: string): ModuleTheme => {
  return moduleThemes[moduleName] || moduleThemes.default;
};