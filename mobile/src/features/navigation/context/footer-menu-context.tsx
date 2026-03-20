import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';

export type FooterMenuId =
  | 'atendimento'
  | 'agendamentos'
  | 'customers'
  | 'calendar'
  | 'release'
  | 'releaseParticular'
  | 'waitlist';

type FooterMenuConfig = {
  id: FooterMenuId;
  label: string;
  feature?: 'atendimento' | 'atendimentos' | 'pacientes' | 'agenda';
  routeRule?: {
    path: string;
    method: string;
  };
};

const FOOTER_MENU_CONFIGS: FooterMenuConfig[] = [
  { id: 'atendimento', label: 'Atendimento', feature: 'atendimento' },
  { id: 'agendamentos', label: 'Agendamentos', feature: 'atendimentos' },
  { id: 'customers', label: 'Pacientes', feature: 'pacientes' },
  { id: 'calendar', label: 'Agenda', feature: 'agenda' },
  { id: 'release', label: 'Liberação', routeRule: { path: '/agendamentos-liberar/:id', method: 'PUT' } },
  {
    id: 'releaseParticular',
    label: 'Liberação particulares',
    routeRule: { path: '/agendamentos-liberar-particular/:id', method: 'PUT' },
  },
  { id: 'waitlist', label: 'Fila de espera', routeRule: { path: '/fila-de-espera', method: 'GET' } },
];

const DEFAULT_SELECTED: FooterMenuId[] = ['atendimento', 'agendamentos', 'customers', 'calendar'];

type FooterMenuContextValue = {
  isReady: boolean;
  selectedMenus: FooterMenuId[];
  availableMenus: FooterMenuConfig[];
  selectedCount: number;
  isSelected: (id: FooterMenuId) => boolean;
  toggleMenu: (id: FooterMenuId) => boolean;
  resetToDefault: () => void;
};

const FooterMenuContext = createContext<FooterMenuContextValue | null>(null);

function isFooterMenuId(value: string): value is FooterMenuId {
  return (
    value === 'atendimento'
    || value === 'agendamentos'
    || value === 'customers'
    || value === 'calendar'
    || value === 'release'
    || value === 'releaseParticular'
    || value === 'waitlist'
  );
}

function normalizeSelection(candidate: string[], availableIds: FooterMenuId[]) {
  const seen = new Set<string>();
  const filtered = candidate
    .filter(isFooterMenuId)
    .filter((id) => availableIds.includes(id))
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 4);

  if (filtered.length) {
    return filtered;
  }

  const defaultSelection = DEFAULT_SELECTED.filter((id) => availableIds.includes(id));
  if (defaultSelection.length) {
    return defaultSelection.slice(0, 4);
  }

  return availableIds.slice(0, 4);
}

export function FooterMenuProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isInitializing, canAccessFeature, permissions } = useAuth();
  const [selectedMenus, setSelectedMenus] = useState<FooterMenuId[]>(DEFAULT_SELECTED);
  const [isReady, setIsReady] = useState(false);

  const availableMenus = useMemo(() => {
    return FOOTER_MENU_CONFIGS.filter((menu) => {
      if (menu.feature) {
        return canAccessFeature(menu.feature);
      }

      if (menu.routeRule) {
        return hasRoutePermission(permissions, menu.routeRule);
      }

      return false;
    });
  }, [canAccessFeature, permissions]);

  const availableIds = useMemo(() => availableMenus.map((item) => item.id), [availableMenus]);

  const storageKey = useMemo(() => {
    if (!isAuthenticated || !user?.id) return null;
    return `probotec_footer_menus_${user.id}`;
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    let active = true;

    async function loadSelection() {
      if (isInitializing) return;

      if (!storageKey) {
        const fallback = normalizeSelection(DEFAULT_SELECTED, availableIds);
        if (active) {
          setSelectedMenus(fallback);
          setIsReady(true);
        }
        return;
      }

      try {
        const raw = await SecureStore.getItemAsync(storageKey);
        const parsed = raw ? (JSON.parse(raw) as string[]) : DEFAULT_SELECTED;
        const normalized = normalizeSelection(parsed, availableIds);

        if (active) {
          setSelectedMenus(normalized);
        }
      } catch {
        if (active) {
          setSelectedMenus(normalizeSelection(DEFAULT_SELECTED, availableIds));
        }
      } finally {
        if (active) {
          setIsReady(true);
        }
      }
    }

    setIsReady(false);
    void loadSelection();

    return () => {
      active = false;
    };
  }, [availableIds, isInitializing, storageKey]);

  useEffect(() => {
    if (!isReady) return;

    const normalized = normalizeSelection(selectedMenus, availableIds);
    const changed = normalized.length !== selectedMenus.length || normalized.some((id, index) => id !== selectedMenus[index]);

    if (changed) {
      setSelectedMenus(normalized);
    }
  }, [availableIds, isReady, selectedMenus]);

  useEffect(() => {
    if (!isReady || !storageKey) return;

    void SecureStore.setItemAsync(storageKey, JSON.stringify(selectedMenus));
  }, [isReady, selectedMenus, storageKey]);

  const toggleMenu = useCallback((id: FooterMenuId) => {
    let changed = false;

    setSelectedMenus((current) => {
      const isSelected = current.includes(id);

      if (isSelected) {
        changed = true;
        return current.filter((item) => item !== id);
      }

      if (current.length >= 4) {
        changed = false;
        return current;
      }

      changed = true;
      return [...current, id];
    });

    return changed;
  }, []);

  const resetToDefault = useCallback(() => {
    setSelectedMenus(normalizeSelection(DEFAULT_SELECTED, availableIds));
  }, [availableIds]);

  const value = useMemo<FooterMenuContextValue>(
    () => ({
      isReady,
      selectedMenus,
      availableMenus,
      selectedCount: selectedMenus.length,
      isSelected: (id: FooterMenuId) => selectedMenus.includes(id),
      toggleMenu,
      resetToDefault,
    }),
    [availableMenus, isReady, resetToDefault, selectedMenus, toggleMenu],
  );

  return <FooterMenuContext.Provider value={value}>{children}</FooterMenuContext.Provider>;
}

export function useFooterMenus() {
  const context = useContext(FooterMenuContext);

  if (!context) {
    throw new Error('useFooterMenus deve ser usado dentro de FooterMenuProvider.');
  }

  return context;
}
