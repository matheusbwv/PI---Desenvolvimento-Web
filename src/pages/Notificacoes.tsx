import { clsx } from 'clsx';
import { ArrowUpCircle, ClipboardCheck, ListTodo, Megaphone, UserPlus, UserRoundCheck, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Abas } from '@/components/ui/Abas';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Cartao } from '@/components/ui/Cartao';
import { Paginacao, usePaginacao } from '@/components/ui/Tabela';
import { tempoRelativo } from '@/lib/formatacao';
import { useDados } from '@/store/dados';
import type { Notificacao, TipoNotificacao } from '@/types';

const ICONE: Record<TipoNotificacao, LucideIcon> = {
  inscricao: UserPlus,
  vaga: ArrowUpCircle,
  comunicado: Megaphone,
  presenca: ClipboardCheck,
  demanda: ListTodo,
  membro: UserRoundCheck,
};

type Aba = 'todas' | 'naoLidas' | 'inscricoes' | 'comunicados';

const filtros: Record<Aba, (n: Notificacao) => boolean> = {
  todas: () => true,
  naoLidas: (n) => !n.lida,
  inscricoes: (n) => n.tipo === 'inscricao' || n.tipo === 'vaga' || n.tipo === 'presenca',
  comunicados: (n) => n.tipo === 'comunicado',
};

export default function Notificacoes() {
  const navegar = useNavigate();
  const notificacoes = useDados((s) => s.notificacoes);
  const marcarComoLida = useDados((s) => s.marcarComoLida);
  const marcarTodas = useDados((s) => s.marcarTodasComoLidas);
  const [aba, setAba] = useState<Aba>('todas');

  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  const lista = notificacoes.filter(filtros[aba]);
  const paginacao = usePaginacao(lista, 8);

  return (
    <>
      <CabecalhoPagina
        titulo="Notificações"
        subtitulo="Acompanhe os avisos e atualizações do sistema."
        acoes={
          <Botao
            variante="secundario"
            disabled={naoLidas === 0}
            onClick={() => {
              marcarTodas();
              toast.success('Todas as notificações foram marcadas como lidas.');
            }}
          >
            Marcar todas como lidas
          </Botao>
        }
      />

      <Abas<Aba>
        ativa={aba}
        aoMudar={setAba}
        itens={[
          { id: 'todas', rotulo: 'Todas', contagem: notificacoes.length },
          { id: 'naoLidas', rotulo: 'Não lidas', contagem: naoLidas },
          { id: 'inscricoes', rotulo: 'Inscrições' },
          { id: 'comunicados', rotulo: 'Comunicados' },
        ]}
      />

      <Cartao className="max-w-[912px] overflow-hidden">
        {lista.length === 0 && <p className="px-6 py-12 text-center text-[14px] text-muted">Nenhuma notificação por aqui.</p>}
        <ul className="divide-y divide-line">
          {paginacao.paginados.map((n) => {
            const Icone = ICONE[n.tipo];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    marcarComoLida(n.id);
                    navegar(n.link);
                  }}
                  className={clsx(
                    'flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-subtle',
                    !n.lida && 'bg-primary-soft/25',
                  )}
                >
                  <span className="flex w-2 shrink-0 justify-center">
                    {!n.lida && <span className="size-2 rounded-full bg-primary" aria-label="Não lida" />}
                  </span>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icone className="size-[18px]" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-bold text-ink">{n.titulo}</span>
                    <span className="block truncate text-[13.5px] text-muted">
                      {n.descricao} · {tempoRelativo(n.criadaEm)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Paginacao {...paginacao} rotulo="notificações" />
      </Cartao>
    </>
  );
}
