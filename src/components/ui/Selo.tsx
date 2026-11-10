import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export type TomSelo = 'azul' | 'verde' | 'laranja' | 'vermelho' | 'roxo' | 'cinza';

export const tons: Record<TomSelo, string> = {
  azul: 'bg-primary-soft text-brand',
  verde: 'bg-success-soft text-success',
  laranja: 'bg-warning-soft text-warning',
  vermelho: 'bg-danger-soft text-danger',
  roxo: 'bg-purple-soft text-purple',
  cinza: 'bg-neutral-soft text-muted',
};

/** Etiqueta arredondada de situação/categoria (ex.: "Ativo", "Em andamento"). */
export function Selo({ tom, children, className }: { tom: TomSelo; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-medium',
        tons[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}
