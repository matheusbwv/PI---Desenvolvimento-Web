import { useMemo } from 'react';
import { Link } from 'react-router';
import { CartaoComTitulo, CartaoNumero } from '@/components/ui/Cartao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Selo } from '@/components/ui/Selo';
import { formatarDiaMes, hojeISO, limitesDoPeriodo, periodoAtual, somarMeses, tempoRelativo, variacaoPercentual } from '@/lib/formatacao';
import { origemAtividade, proximasAtividades, tomAtividade } from '@/lib/regras';
import { useDados } from '@/store/dados';

export default function Painel() {
  const membros = useDados((s) => s.membros);
  const grupos = useDados((s) => s.grupos);
  const atividades = useDados((s) => s.atividades);
  const inscricoes = useDados((s) => s.inscricoes);
  const notificacoes = useDados((s) => s.notificacoes);
  const marcarComoLida = useDados((s) => s.marcarComoLida);

  const numeros = useMemo(() => {
    const hoje = hojeISO();
    const periodo = periodoAtual();
    const inicioMes = limitesDoPeriodo(periodo).inicio;
    const anterior = somarMeses(periodo, -1);

    const ativos = membros.filter((m) => m.situacao === 'Ativo');
    const ativosAntes = ativos.filter((m) => m.criadoEm < inicioMes).length;

    const noventaDias = new Date();
    noventaDias.setDate(noventaDias.getDate() - 90);
    const novosGrupos = grupos.filter((g) => g.criadoEm >= noventaDias.toISOString().slice(0, 10)).length;

    const doMes = atividades.filter((a) => a.data.startsWith(periodo) && a.situacao !== 'Cancelada');
    const emAndamento = doMes.filter((a) => a.situacao === 'Inscrições abertas' || a.situacao === 'Confirmado').length;

    const idsFuturas = new Set(atividades.filter((a) => a.data >= hoje).map((a) => a.id));
    const inscricoesAtivas = inscricoes.filter((i) => i.situacao !== 'Cancelada' && idsFuturas.has(i.atividadeId)).length;
    const inscricoesMes = inscricoes.filter((i) => i.situacao !== 'Cancelada' && i.criadaEm.startsWith(periodo)).length;
    const inscricoesMesAnterior = inscricoes.filter((i) => i.situacao !== 'Cancelada' && i.criadaEm.startsWith(anterior)).length;

    return {
      membrosAtivos: ativos.length,
      variacaoMembros: variacaoPercentual(ativos.length, ativosAntes),
      grupos: grupos.filter((g) => g.situacao === 'Ativo').length,
      novosGrupos,
      atividadesMes: doMes.length,
      emAndamento,
      inscricoesAtivas,
      variacaoInscricoes: variacaoPercentual(inscricoesMes, inscricoesMesAnterior),
    };
  }, [membros, grupos, atividades, inscricoes]);

  const proximas = useMemo(() => proximasAtividades(atividades).slice(0, 3), [atividades]);
  const recentes = notificacoes.slice(0, 4);

  return (
    <>
      <CabecalhoPagina titulo="Painel inicial" subtitulo="Visão geral da comunidade e das atividades." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoNumero
          rotulo="Membros ativos"
          valor={numeros.membrosAtivos}
          detalhe={`${numeros.variacaoMembros.texto} em relação ao mês anterior`}
        />
        <CartaoNumero
          rotulo="Grupos comunitários"
          valor={numeros.grupos}
          detalhe={numeros.novosGrupos > 0 ? `+${numeros.novosGrupos} novos grupos` : 'Nenhum grupo novo'}
        />
        <CartaoNumero
          rotulo="Atividades e eventos"
          valor={numeros.atividadesMes}
          detalhe={`${numeros.emAndamento} em andamento`}
        />
        <CartaoNumero
          rotulo="Inscrições ativas"
          valor={numeros.inscricoesAtivas}
          detalhe={`${numeros.variacaoInscricoes.texto} em relação ao mês anterior`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <CartaoComTitulo
          titulo="Próximas atividades"
          acao={
            <Link to="/atividades" className="text-[13.5px] text-primary hover:underline">
              Ver agenda
            </Link>
          }
        >
          {proximas.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-muted">Nenhuma atividade programada.</p>
          ) : (
            <ul className="divide-y divide-line">
              {proximas.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/atividades/${a.id}`}
                    className="-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-3.5 hover:bg-subtle"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-bold text-ink">{a.titulo}</p>
                      <p className="truncate text-[13px] text-muted">
                        {origemAtividade(a, grupos)} · {formatarDiaMes(a.data)} · {a.horaInicio} - {a.horaFim}
                      </p>
                    </div>
                    <Selo tom={tomAtividade[a.situacao]}>{a.situacao}</Selo>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CartaoComTitulo>

        <CartaoComTitulo
          titulo="Notificações recentes"
          acao={
            <Link to="/notificacoes" className="text-[13.5px] text-primary hover:underline">
              Ver todas
            </Link>
          }
        >
          {recentes.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-muted">Nenhuma notificação.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentes.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.link}
                    onClick={() => marcarComoLida(n.id)}
                    className="-mx-2 block rounded-md px-2 py-3.5 hover:bg-subtle"
                  >
                    <p className="flex items-center gap-2 text-[14.5px] text-ink">
                      {!n.lida && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
                      <span className="truncate">{n.titulo}</span>
                    </p>
                    <p className="text-[13px] text-muted">{tempoRelativo(n.criadaEm)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CartaoComTitulo>
      </div>
    </>
  );
}
