import { clsx } from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export function Cartao({ className, ...props }: ComponentProps<'div'>) {
  return <div className={clsx('rounded-xl border border-line bg-white', className)} {...props} />;
}

/** Cartão com título no topo e uma linha divisória (ex.: "Próximas atividades"). */
export function CartaoComTitulo({
  titulo,
  acao,
  children,
  className,
}: {
  titulo: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Cartao className={clsx('p-5 sm:px-6', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3.5">
        <h2 className="text-[16px] font-bold text-ink">{titulo}</h2>
        {acao}
      </div>
      {children}
    </Cartao>
  );
}

/** Par rótulo/valor das telas de detalhes (ex.: "Responsável — Ana Silva"). */
export function Informacao({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-muted">{rotulo}</p>
      <div className="mt-0.5 text-[15px] text-ink">{valor}</div>
    </div>
  );
}

/** Número de destaque (ex.: "Membros ativos 248"). */
export function CartaoNumero({
  rotulo,
  valor,
  detalhe,
  numeroAcima = false,
  valorClassName,
  detalheClassName,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  numeroAcima?: boolean;
  valorClassName?: string;
  detalheClassName?: string;
}) {
  if (numeroAcima) {
    return (
      <Cartao className="px-4 py-5">
        <p className={clsx('text-[32px] leading-10 font-bold tracking-tight text-ink', valorClassName)}>{valor}</p>
        <p className="mt-1.5 text-[13.5px] text-muted">{rotulo}</p>
        {detalhe && <p className={clsx('text-[13.5px]', detalheClassName)}>{detalhe}</p>}
      </Cartao>
    );
  }
  return (
    <Cartao className="px-4 py-5">
      <p className="text-[13.5px] text-muted">{rotulo}</p>
      <p className={clsx('mt-1.5 text-[32px] leading-10 font-bold tracking-tight text-ink', valorClassName)}>{valor}</p>
      {detalhe && <p className={clsx('mt-2 text-[13px] text-muted', detalheClassName)}>{detalhe}</p>}
    </Cartao>
  );
}
