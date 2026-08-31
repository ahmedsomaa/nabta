/** Build 1–2 character initials from a display name (EN or AR). */
export function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstWord = parts[0] ?? '';
  const secondWord = parts[1] ?? '';
  const first = [...firstWord];
  const second = [...secondWord];

  const raw =
    second.length > 0
      ? `${first[0] ?? ''}${second[0] ?? ''}`
      : first.slice(0, 2).join('');

  return /[A-Za-z]/.test(raw) ? raw.toUpperCase() : raw;
}
