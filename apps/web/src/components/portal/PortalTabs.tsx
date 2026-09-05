import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Chip, Tabs } from '@heroui/react';
import { cn } from '@/lib/cn';

export function PortalTabs({
  label,
  items,
  end,
}: {
  label: string;
  items: { id: string; title: string; count?: number; content: ReactNode }[];
  end?: ReactNode;
}) {
  return (
    <Tabs className="w-full min-w-0" variant="secondary">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs.ListContainer className="min-w-0 overflow-x-auto">
          <Tabs.List aria-label={label} className="flex-nowrap">
            {items.map((item) => (
              <Tabs.Tab key={item.id} id={item.id} className="whitespace-nowrap">
                <span className="whitespace-nowrap">
                  {item.title}
                  {item.count != null ? (
                    <sup className="ms-0.5 text-[0.65em] font-semibold tabular-nums text-accent">
                      {item.count}
                    </sup>
                  ) : null}
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {end}
      </div>
      {items.map((item) => (
        <Tabs.Panel key={item.id} className="pt-4" id={item.id}>
          {item.content}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

export function PortalFilterChips<T extends string>({
  value,
  onChange,
  options,
  bordered = false,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { id: T; label: string; count?: number }[];
  bordered?: boolean;
}) {
  return (
    <div
      className={
        bordered
          ? 'flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2'
          : 'flex flex-wrap gap-2'
      }
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            className="rounded-full"
            onClick={() => onChange(option.id)}
          >
            <Chip
              size="sm"
              color={selected ? 'accent' : 'default'}
              variant={selected ? 'soft' : 'tertiary'}
            >
              <span className="whitespace-nowrap">{option.label}</span>
              {option.count != null ? (
                <sup className="ms-0.5 text-[0.65em] font-semibold tabular-nums text-accent">
                  {option.count}
                </sup>
              ) : null}
            </Chip>
          </button>
        );
      })}
    </div>
  );
}

export function PortalNavTabs({
  label,
  items,
}: {
  label: string;
  items: { to: string; title: string; count?: number; end?: boolean }[];
}) {
  return (
    <nav aria-label={label} className="min-w-0 overflow-x-auto rounded-2xl bg-default p-1">
      <ul className="flex w-max min-w-full flex-nowrap gap-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex h-8 items-center whitespace-nowrap rounded-3xl px-4 text-sm font-medium no-underline transition-colors',
                  isActive
                    ? 'bg-segment text-segment-foreground shadow-surface'
                    : 'text-muted hover:text-foreground',
                )
              }
            >
              {item.title}
              {item.count != null ? (
                <sup className="ms-0.5 text-[0.65em] font-semibold tabular-nums text-accent">
                  {item.count}
                </sup>
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
