import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface ItemTrilha {
  rotulo: string;
  para?: string;
}

/** Título da página, subtítulo, trilha (breadcrumb) e botões à direita. */
export function CabecalhoPagina({
  titulo,
  subtitulo,
  acoes,
  trilha,
  selo,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acoes?: ReactNode;
  trilha?: ItemTrilha[];
  selo?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {trilha && (
        <nav aria-label="Você está em" className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-muted">
          {trilha.map((item, i) => (
            <span key={item.rotulo} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
              {item.para ? (
                <Link to={item.para} className="hover:text-primary hover:underline">
                  {item.rotulo}
                </Link>
              ) : (
                <span>{item.rotulo}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[24px] leading-8 font-bold tracking-tight text-ink">{titulo}</h1>
            {selo}
          </div>
          {subtitulo && <p className="mt-1 text-[14px] text-muted">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{acoes}</div>}
      </div>
    </div>
  );
}
