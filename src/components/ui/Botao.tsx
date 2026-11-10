import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Link } from 'react-router';

export type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'contorno' | 'fantasma';
export type TamanhoBotao = 'md' | 'sm' | 'lg';

const variantes: Record<VarianteBotao, string> = {
  primario: 'bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50',
  secundario: 'border border-line bg-white text-ink hover:bg-subtle disabled:text-placeholder',
  perigo: 'border border-danger/40 bg-white text-danger hover:bg-danger-soft/60',
  contorno: 'border border-primary bg-white text-primary hover:bg-primary-soft',
  fantasma: 'text-icon hover:bg-page hover:text-ink',
};

const tamanhos: Record<TamanhoBotao, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-9 gap-2 px-4 text-[13.5px]',
  lg: 'h-11 gap-2 px-5 text-[15px]',
};

export function classesBotao(variante: VarianteBotao = 'primario', tamanho: TamanhoBotao = 'md', extra?: string) {
  return clsx(
    'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md font-semibold transition-colors disabled:cursor-not-allowed',
    variantes[variante],
    tamanhos[tamanho],
    extra,
  );
}

interface PropsBotao extends ComponentProps<'button'> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  icone?: LucideIcon;
}

export function Botao({ variante, tamanho, icone: Icone, className, children, type = 'button', ...props }: PropsBotao) {
  return (
    <button type={type} className={classesBotao(variante, tamanho, className)} {...props}>
      {Icone && <Icone className="size-4" aria-hidden />}
      {children}
    </button>
  );
}

interface PropsBotaoLink extends ComponentProps<typeof Link> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  icone?: LucideIcon;
}

/** Link com aparência de botão (ex.: "+ Novo membro"). */
export function BotaoLink({ variante, tamanho, icone: Icone, className, children, ...props }: PropsBotaoLink) {
  return (
    <Link className={classesBotao(variante, tamanho, className)} {...props}>
      {Icone && <Icone className="size-4" aria-hidden />}
      {children}
    </Link>
  );
}
