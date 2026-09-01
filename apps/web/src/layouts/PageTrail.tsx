import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type TrailItem = { label: string; to?: string };

type PageTrailContextValue = {
  trail: TrailItem[];
  setTrail: (items: TrailItem[]) => void;
};

const PageTrailContext = createContext<PageTrailContextValue | null>(null);

let trailGeneration = 0;

export function PageTrailProvider({ children }: { children: ReactNode }) {
  const [trail, setTrailState] = useState<TrailItem[]>([]);
  const setTrail = useCallback((items: TrailItem[]) => {
    setTrailState(items);
  }, []);
  const value = useMemo(() => ({ trail, setTrail }), [trail, setTrail]);
  return <PageTrailContext.Provider value={value}>{children}</PageTrailContext.Provider>;
}

export function usePageTrailItems() {
  return useContext(PageTrailContext)?.trail ?? [];
}

export function usePageTrail(items: TrailItem[]) {
  const setTrail = useContext(PageTrailContext)?.setTrail;
  const key = JSON.stringify(items);
  useLayoutEffect(() => {
    if (!setTrail) return;
    const generation = ++trailGeneration;
    setTrail(JSON.parse(key) as TrailItem[]);
    return () => {
      if (trailGeneration === generation) setTrail([]);
    };
  }, [key, setTrail]);
}
