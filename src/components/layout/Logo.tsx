import { clsx } from 'clsx';
import { HeartHandshake } from 'lucide-react';

/** Marca do SESFA: quadrado azul + nome + "Gestão de Comunidade". */
export function Logo({ grande = false }: { grande?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={clsx(
          'flex shrink-0 items-center justify-center bg-primary text-white',
          grande ? 'size-[54px] rounded-xl' : 'size-6 rounded-md',
        )}
        aria-hidden
      >
        <HeartHandshake className={grande ? 'size-7' : 'size-3.5'} strokeWidth={2.2} />
      </span>
      <div className="leading-none">
        <p className={clsx('font-bold tracking-tight text-brand', grande ? 'text-[40px] leading-[44px]' : 'text-[19px] leading-6')}>
          SESFA
        </p>
        <p className={clsx('text-muted', grande ? 'mt-0.5 text-[16px]' : 'text-[11px]')}>Gestão de Comunidade</p>
      </div>
    </div>
  );
}
