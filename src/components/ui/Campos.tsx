import { clsx } from 'clsx';
import { ChevronDown, Search } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

const base =
  'w-full rounded-lg border border-line bg-white px-3.5 text-[14px] text-ink outline-none transition-shadow ' +
  'focus:border-primary focus:ring-3 focus:ring-primary/15 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10 ' +
  'disabled:bg-subtle disabled:text-muted';

/** Rótulo + campo + mensagem de erro. */
export function Campo({
  rotulo,
  obrigatorio,
  erro,
  dica,
  htmlFor,
  children,
  className,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  erro?: string;
  dica?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13.5px] font-medium text-ink">
        {rotulo}
        {obrigatorio && <span aria-hidden> *</span>}
      </label>
      {children}
      {erro ? (
        <p role="alert" className="mt-1 text-[12.5px] text-danger">
          {erro}
        </p>
      ) : (
        dica && <p className="mt-1 text-[12.5px] text-muted">{dica}</p>
      )}
    </div>
  );
}

export function Entrada({ className, ...props }: ComponentProps<'input'>) {
  return <input className={clsx(base, 'h-10', className)} {...props} />;
}

export function AreaTexto({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={clsx(base, 'min-h-[112px] resize-y py-2.5', className)} {...props} />;
}

/** Campo de seleção. A primeira opção vazia ("Selecione...") aparece em cinza. */
export function Selecao({
  className,
  children,
  placeholder,
  ...props
}: ComponentProps<'select'> & { placeholder?: string }) {
  return (
    <div className="relative">
      <select
        className={clsx(
          base,
          'h-10 cursor-pointer appearance-none pr-9 has-[option[value=""]:checked]:text-placeholder',
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}

export function CaixaMarcacao({
  rotulo,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { rotulo?: ReactNode }) {
  const caixa = (
    <input type="checkbox" className="size-4 shrink-0 cursor-pointer rounded accent-primary" {...props} />
  );
  if (!rotulo) return caixa;
  return (
    <label className={clsx('inline-flex cursor-pointer items-center gap-2.5 text-[14px] text-ink', className)}>
      {caixa}
      {rotulo}
    </label>
  );
}

/** Campo de busca com lupa. */
export function CampoBusca({ className, ...props }: ComponentProps<'input'>) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input type="search" className={clsx(base, 'h-10 pl-10')} {...props} />
    </div>
  );
}

/** Grade de campos de formulário com seções ("Dados pessoais", "Contato"...). */
export function SecaoFormulario({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      {titulo && <h2 className="text-[16px] font-bold text-ink">{titulo}</h2>}
      {children}
    </section>
  );
}
