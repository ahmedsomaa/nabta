import { Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BrandMark({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-semibold text-foreground no-underline">
      <Sprout className="size-6 text-accent" aria-hidden />
      <span>Nabta</span>
    </Link>
  );
}
