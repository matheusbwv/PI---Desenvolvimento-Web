import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { ITENS_POR_PAGINA } from '@/lib/opcoes';
import { Cartao } from './Cartao';

/** Cartão com tabela rolável na horizontal em telas pequenas. */
export function Tabela({ children, rodape, className }: { children: ReactNode; rodape?: ReactNode; className?: string }) {
  return (
    <Cartao className={clsx('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">{children}</table>
      </div>
      {rodape}
    </Cartao>
  );
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={clsx('h-11 border-b border-line px-4 text-[13.5px] font-normal whitespace-nowrap text-muted first:pl-6', className)}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      className={clsx('h-[46px] border-b border-line px-4 py-2 text-[14px] text-ink first:pl-6 group-last:border-b-0', className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={clsx('group transition-colors hover:bg-subtle', className)} {...props} />;
}

/** Linha de "nenhum resultado" ocupando todas as colunas. */
export function LinhaVazia({ colunas, texto = 'Nenhum registro encontrado.' }: { colunas: number; texto?: string }) {
  return (
    <tr>
      <td colSpan={colunas} className="px-6 py-12 text-center text-[14px] text-muted">
        <Inbox className="mx-auto mb-2 size-7 text-placeholder" aria-hidden />
        {texto}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------- Paginação
/** Divide uma lista em páginas e volta para a página 1 quando a lista muda de tamanho. */
export function usePaginacao<T>(itens: T[], porPagina = ITENS_POR_PAGINA) {
  const [pagina, setPagina] = useState(1);
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const atual = Math.min(pagina, totalPaginas);
  const paginados = useMemo(
    () => itens.slice((atual - 1) * porPagina, atual * porPagina),
    [itens, atual, porPagina],
  );

  return {
    pagina: atual,
    setPagina,
    paginados,
    total,
    totalPaginas,
    inicio: total === 0 ? 0 : (atual - 1) * porPagina + 1,
    fim: Math.min(atual * porPagina, total),
  };
}

function paginasVisiveis(atual: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const paginas = new Set([1, total, atual - 1, atual, atual + 1]);
  if (atual <= 3) [2, 3].forEach((p) => paginas.add(p));
  if (atual >= total - 2) [total - 1, total - 2].forEach((p) => paginas.add(p));
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const resultado: (number | '…')[] = [];
  ordenadas.forEach((p, i) => {
    if (i > 0 && p - ordenadas[i - 1] > 1) resultado.push('…');
    resultado.push(p);
  });
  return resultado;
}

const botaoPagina =
  'inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border px-2 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40';

/** Rodapé "Mostrando 1 a 5 de 248 registros" + botões de página. */
export function Paginacao({
  pagina,
  totalPaginas,
  total,
  inicio,
  fim,
  setPagina,
  rotulo = 'registros',
}: ReturnType<typeof usePaginacao> & { rotulo?: string }) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13.5px] text-muted">
        Mostrando {inicio} a {fim} de {total} {rotulo}
      </p>
      {totalPaginas > 1 && (
        <nav aria-label="Paginação" className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={pagina === 1}
            onClick={() => setPagina(pagina - 1)}
            className={clsx(botaoPagina, 'border-line bg-white text-ink hover:bg-subtle')}
          >
            <ChevronLeft className="size-3.5" />
          </button>
          {paginasVisiveis(pagina, totalPaginas).map((p, i) =>
            p === '…' ? (
              <span key={`r${i}`} className={clsx(botaoPagina, 'border-line bg-white text-muted')}>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === pagina ? 'page' : undefined}
                onClick={() => setPagina(p)}
                className={clsx(
                  botaoPagina,
                  p === pagina ? 'border-primary bg-primary text-white' : 'border-line bg-white text-ink hover:bg-subtle',
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label="Próxima página"
            disabled={pagina === totalPaginas}
            onClick={() => setPagina(pagina + 1)}
            className={clsx(botaoPagina, 'border-line bg-white text-ink hover:bg-subtle')}
          >
            <ChevronRight className="size-3.5" />
          </button>
        </nav>
      )}
    </div>
  );
}
