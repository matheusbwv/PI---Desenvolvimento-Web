import { clsx } from 'clsx';
import { NavLink } from 'react-router';

export interface ItemAba<T extends string = string> {
  id: T;
  rotulo: string;
  contagem?: number;
  /** Se informado, a aba vira um link de rota. */
  para?: string;
}

const classe = (ativa: boolean) =>
  clsx(
    'whitespace-nowrap border-b-2 pb-3 text-[14.5px] transition-colors',
    ativa ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted hover:text-ink',
  );

/** Abas sublinhadas ("Todos (5)", "Publicados (4)"...). */
export function Abas<T extends string>({
  itens,
  ativa,
  aoMudar,
  className,
}: {
  itens: ItemAba<T>[];
  ativa?: T;
  aoMudar?: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={clsx('mb-5 flex gap-8 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-line)]', className)}
    >
      {itens.map((item) => {
        const texto = item.contagem === undefined ? item.rotulo : `${item.rotulo} (${item.contagem})`;
        if (item.para) {
          return (
            <NavLink key={item.id} to={item.para} end className={({ isActive }) => classe(isActive)}>
              {texto}
            </NavLink>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={ativa === item.id}
            onClick={() => aoMudar?.(item.id)}
            className={clsx(classe(ativa === item.id), 'cursor-pointer')}
          >
            {texto}
          </button>
        );
      })}
    </div>
  );
}
