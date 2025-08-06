import { useEffect, useCallback, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number; // Porcentagem da altura para disparar (default: 0.9 = 90%)
  rootMargin?: string; // Margem para intersection observer
  enabled?: boolean; // Se está habilitado
}

interface UseInfiniteScrollReturn {
  targetRef: React.RefObject<HTMLDivElement>; // Ref para o elemento de scroll
  isNearEnd: boolean; // Se está próximo ao final
}

/**
 * Hook para detectar quando o usuário está próximo ao final da rolagem
 * e disparar carregamento de mais dados (infinite scroll)
 */
export const useInfiniteScroll = (
  onLoadMore: () => void,
  hasNextPage: boolean,
  isLoading: boolean,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn => {
  const {
    threshold = 0.9,
    rootMargin = '100px',
    enabled = true
  } = options;

  const targetRef = useRef<HTMLDivElement>(null);
  const isNearEnd = useRef(false);

  const handleScroll = useCallback(() => {
    if (!enabled || isLoading || !hasNextPage || !targetRef.current) {
      return;
    }

    const element = targetRef.current;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Calcula se estamos próximos ao final baseado no threshold
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    const nearEnd = scrollPercentage >= threshold;

    if (nearEnd && !isNearEnd.current) {
      isNearEnd.current = true;
      onLoadMore();
    } else if (!nearEnd) {
      isNearEnd.current = false;
    }
  }, [enabled, isLoading, hasNextPage, threshold, onLoadMore]);

  useEffect(() => {
    const element = targetRef.current;
    if (!element || !enabled) return;

    // Throttle para melhor performance
    let timeoutId: NodeJS.Timeout;
    const throttledScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    element.addEventListener('scroll', throttledScroll, { passive: true });

    return () => {
      element.removeEventListener('scroll', throttledScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleScroll, enabled]);

  return {
    targetRef,
    isNearEnd: isNearEnd.current
  };
};

/**
 * Hook customizado que detecta o breakpoint atual
 * Útil para decidir quando usar infinite scroll vs paginação
 */
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1536) setBreakpoint('2xl');
      else if (width >= 1280) setBreakpoint('xl');
      else if (width >= 1024) setBreakpoint('lg');
      else if (width >= 768) setBreakpoint('md');
      else setBreakpoint('sm');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = breakpoint === 'xl' || breakpoint === '2xl';
  const isMobile = !isDesktop; // sm, md, lg

  return {
    breakpoint,
    isDesktop,
    isMobile,
    isSmall: breakpoint === 'sm',
    isMedium: breakpoint === 'md',
    isLarge: breakpoint === 'lg',
    isXLarge: breakpoint === 'xl',
    is2XLarge: breakpoint === '2xl'
  };
};