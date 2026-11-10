import { clsx } from 'clsx';
import {
  CalendarDays,
  FileText,
  ListTodo,
  Megaphone,
  Search,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { contemTexto, formatarData } from '@/lib/formatacao';
import { useDados } from '@/store/dados';

interface Resultado {
  chave: string;
  titulo: string;
  detalhe: string;
  tipo: string;
  icone: LucideIcon;
  para: string;
}

/** "Pesquisar no sistema..." — procura em membros, grupos, atividades, demandas, comunicados e documentos. */
export function BuscaGlobal() {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [aberta, setAberta] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);

  const membros = useDados((s) => s.membros);
  const grupos = useDados((s) => s.grupos);
  const atividades = useDados((s) => s.atividades);
  const demandas = useDados((s) => s.demandas);
  const comunicados = useDados((s) => s.comunicados);
  const documentos = useDados((s) => s.documentos);

  const resultados = useMemo<Resultado[]>(() => {
    const busca = texto.trim();
    if (busca.length < 2) return [];
    const lista: Resultado[] = [
      ...membros
        .filter((m) => contemTexto(m.nome, busca) || m.codigo.includes(busca))
        .map((m) => ({ chave: `m${m.id}`, titulo: m.nome, detalhe: `${m.codigo} · ${m.bairro}`, tipo: 'Membro', icone: UserRound, para: `/membros/${m.id}/editar` })),
      ...grupos
        .filter((g) => contemTexto(g.nome, busca))
        .map((g) => ({ chave: `g${g.id}`, titulo: g.nome, detalhe: g.bairro, tipo: 'Grupo', icone: UsersRound, para: `/grupos/${g.id}` })),
      ...atividades
        .filter((a) => contemTexto(a.titulo, busca))
        .map((a) => ({ chave: `a${a.id}`, titulo: a.titulo, detalhe: formatarData(a.data), tipo: 'Atividade', icone: CalendarDays, para: `/atividades/${a.id}` })),
      ...demandas
        .filter((d) => contemTexto(d.titulo, busca) || contemTexto(d.codigo, busca))
        .map((d) => ({ chave: `d${d.id}`, titulo: d.titulo, detalhe: d.codigo, tipo: 'Demanda', icone: ListTodo, para: `/demandas/${d.id}` })),
      ...comunicados
        .filter((c) => contemTexto(c.titulo, busca))
        .map((c) => ({ chave: `c${c.id}`, titulo: c.titulo, detalhe: c.situacao, tipo: 'Comunicado', icone: Megaphone, para: `/comunicados/${c.id}/editar` })),
      ...documentos
        .filter((d) => contemTexto(d.nome, busca))
        .map((d) => ({ chave: `doc${d.id}`, titulo: d.nome, detalhe: d.tipo, tipo: 'Documento', icone: FileText, para: `/relatorios/documentos?busca=${encodeURIComponent(d.nome)}` })),
    ];
    return lista.slice(0, 8);
  }, [texto, membros, grupos, atividades, demandas, comunicados, documentos]);

  useEffect(() => setDestaque(0), [texto]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberta(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const abrir = (r: Resultado) => {
    navegar(r.para);
    setTexto('');
    setAberta(false);
  };

  return (
    <div ref={caixa} className="relative w-full max-w-[320px]">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberta(true);
        }}
        onFocus={() => setAberta(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setDestaque((d) => Math.min(d + 1, resultados.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setDestaque((d) => Math.max(d - 1, 0));
          } else if (e.key === 'Enter' && resultados[destaque]) {
            abrir(resultados[destaque]);
          } else if (e.key === 'Escape') {
            setAberta(false);
          }
        }}
        placeholder="Pesquisar no sistema..."
        aria-label="Pesquisar no sistema"
        className="h-[34px] w-full rounded-lg bg-page pr-3 pl-9 text-[13.5px] text-ink outline-none focus:ring-2 focus:ring-primary/30"
      />
      {aberta && texto.trim().length >= 2 && (
        <div className="animar-surgir absolute top-full left-0 z-50 mt-2 w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-lg border border-line bg-white shadow-[0_10px_30px_-10px_rgba(22,35,59,0.3)]">
          {resultados.length === 0 ? (
            <p className="px-4 py-5 text-center text-[13.5px] text-muted">Nada encontrado para “{texto.trim()}”.</p>
          ) : (
            <ul role="listbox" className="py-1">
              {resultados.map((r, i) => {
                const Icone = r.icone;
                return (
                  <li key={r.chave} role="option" aria-selected={i === destaque}>
                    <button
                      type="button"
                      onMouseEnter={() => setDestaque(i)}
                      onClick={() => abrir(r)}
                      className={clsx('flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left', i === destaque && 'bg-page')}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                        <Icone className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-ink">{r.titulo}</span>
                        <span className="block truncate text-[12.5px] text-muted">{r.detalhe}</span>
                      </span>
                      <span className="text-[12px] text-muted">{r.tipo}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
