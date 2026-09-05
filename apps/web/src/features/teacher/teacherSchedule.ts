import type { TeacherClassScheduleSlot } from '@nabta/types';

type ClockRange = { startsAt: string; endsAt: string };

export function minutesFromClock(clock: string) {
  const [hours, minutes] = clock.split(':').map(Number);
  if (hours == null || minutes == null || !Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

export function slotStatus(slot: ClockRange, now = new Date()) {
  const start = minutesFromClock(slot.startsAt);
  const end = minutesFromClock(slot.endsAt);
  if (start == null || end == null) return 'upcoming' as const;
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= start && current < end) return 'current' as const;
  if (current >= end) return 'completed' as const;
  return 'upcoming' as const;
}

export function minutesUntilStart(slot: ClockRange, now = new Date()) {
  const start = minutesFromClock(slot.startsAt);
  if (start == null) return null;
  return start - (now.getHours() * 60 + now.getMinutes());
}

function consecutiveDays(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.every((day, index) => index === 0 || day === sorted[index - 1]! + 1);
}

export function formatScheduleLine(
  slots: TeacherClassScheduleSlot[],
  weekdayLabel: (day: number) => string,
  everyDay: string,
) {
  if (slots.length === 0) return null;
  const groups = new Map<string, { startsAt: string; endsAt: string; room: string | null; days: number[] }>();
  for (const slot of slots) {
    const key = `${slot.startsAt}|${slot.endsAt}|${slot.room ?? ''}`;
    const existing = groups.get(key);
    if (existing) existing.days.push(slot.weekday);
    else {
      groups.set(key, {
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        room: slot.room,
        days: [slot.weekday],
      });
    }
  }
  return [...groups.values()].map((group) => {
    const unique = [...new Set(group.days)].sort((a, b) => a - b);
    const days =
      unique.length === 7
        ? everyDay
        : unique.length >= 2 && consecutiveDays(unique)
          ? `${weekdayLabel(unique[0]!)}–${weekdayLabel(unique[unique.length - 1]!)}`
          : unique.map(weekdayLabel).join(' · ');
    return [days, `${group.startsAt}–${group.endsAt}`].filter(Boolean).join(' · ');
  })[0] ?? null;
}

export function pickActionClass<T extends ClockRange>(
  schedule: T[],
  fallback: T | undefined,
  now = new Date(),
) {
  const current = schedule.find((slot) => slotStatus(slot, now) === 'current');
  if (current) return current;
  const upcoming = schedule.find((slot) => {
    const minutes = minutesUntilStart(slot, now);
    return minutes != null && minutes > 0;
  });
  return upcoming ?? schedule[0] ?? fallback;
}
