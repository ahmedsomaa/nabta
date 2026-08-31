export const SECTION_IDS = ['features', 'for-schools', 'pricing', 'contact'] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export function scrollToId(id: string, behavior: ScrollBehavior = 'smooth') {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior, block: 'start' });
  if (id && window.location.hash !== `#${id}`) {
    history.replaceState(null, '', `#${id}`);
  }
}

export function hashToId(hash: string): string {
  return hash.replace(/^#/, '');
}
