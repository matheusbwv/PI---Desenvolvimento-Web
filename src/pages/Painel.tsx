import { useMemo } from 'react';
import { Link } from 'react-router';
import { CartaoComTitulo, CartaoNumero } from '@/components/ui/Cartao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Selo } from '@/components/ui/Selo';
import { limitesDoPeriodo, periodoAtual, tempoRelativo, variacaoPercentual } from '@/lib/formatacao';
import { tomCadastro } from '@/lib/regras';
import { useDados } from '@/store/dados';

/** Texto de comparação com o mês anterior (sem registros no mês anterior não há percentual). */
function comparacao(variacao: string): string {
  if (variacao === 'novo' || variacao === '—') return 'Sem registros no mês anterior';
  return `${variacao} em relação ao mês anterior`;
}

export default function Painel() {
  const membros = useDados((s) => s.membros);
  const grupos = useDados((s) => s.grupos);
  const comunicados = useDados((s) => s.comunicados);
  const demandas = useDados((s) => s.demandas);
  const notificacoes = useDados((s) => s.notificacoes);
  const usuarios = useDados((s) => s.usuarios);
  const marcarComoLida = useDados((s) => s.marcarComoLida);

  const numeros = useMemo(() => {
    const periodo = periodoAtual();
    const inicioMes = limitesDoPeriodo(periodo).inicio;

    const ativos = membros.filter((m) => m.situacao === 'Ativo');
    const ativosAntes = ativos.filter((m) => m.criadoEm < inicioMes).length;

    const noventaDias = new Date();
    noventaDias.setDate(noventaDias.getDate() - 90);
    const novosGrupos = grupos.filter((g) => g.criadoEm >= noventaDias.toISOString().slice(0, 10)).length;

    const comunicadosPublicados = comunicados.filter((c) => c.situacao === 'Publicado').length;
    const comunicadosMes = comunicados.filter((c) => c.situacao === 'Publicado' && c.criadoEm.startsWith(periodo)).length;

    const demandasAbertas = demandas.filter((d) => d.situacao !== 'Concluída');
    const demandasEmAndamento = demandas.filter((d) => d.situacao === 'Em andamento').length;

    return {
      membrosAtivos: ativos.length,
      variacaoMembros: variacaoPercentual(ativos.length, ativosAntes),
      grupos: grupos.filter((g) => g.situacao === 'Ativo').length,
      novosGrupos,
      comunicadosPublicados,
      comunicadosMes,
      demandasAbertas: demandasAbertas.length,
      demandasEmAndamento,
    };
  }, [membros, grupos, comunicados, demandas]);

  const gruposRecentes = useMemo(() => grupos.slice(0, 5), [grupos]);
  const recentes = notificacoes.slice(0, 4);
  const nomeResponsavel = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '—';

  return (
    <>
      <CabecalhoPagina titulo="Painel inicial" subtitulo="Visão geral da comunidade e dos grupos." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoNumero
          rotulo="Membros ativos"
          valor={numeros.membrosAtivos}
          detalhe={comparacao(numeros.variacaoMembros.texto)}
        />
        <CartaoNumero
          rotulo="Grupos comunitários"
          valor={numeros.grupos}
          detalhe={
            numeros.novosGrupos > 0 ? `+${numeros.novosGrupos} ${numeros.novosGrupos === 1 ? 'novo grupo' : 'novos grupos'}` : 'Nenhum grupo novo'
          }
        />
        <CartaoNumero
          rotulo="Comunicados"
          valor={numeros.comunicadosPublicados}
          detalhe={
            numeros.comunicadosMes > 0
              ? `${numeros.comunicadosMes} publicado${numeros.comunicadosMes === 1 ? '' : 's'} este mês`
              : `${numeros.comunicadosPublicados} no total`
          }
        />
        <CartaoNumero
          rotulo="Demandas ativas"
          valor={numeros.demandasAbertas}
          detalhe={
            numeros.demandasEmAndamento > 0
              ? `${numeros.demandasEmAndamento} em andamento`
              : `${numeros.demandasAbertas} no total`
          }
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <CartaoComTitulo
          titulo="Grupos comunitários"
          acao={
            <Link to="/grupos" className="text-[13.5px] text-primary hover:underline">
              Ver todos
            </Link>
          }
        >
          {gruposRecentes.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-muted">Nenhum grupo cadastrado.</p>
          ) : (
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[13px] font-normal text-muted">
                    <th className="py-2.5 pr-4 pl-5 font-normal sm:pl-6">Grupo</th>
                    <th className="px-4 py-2.5 font-normal">Responsável</th>
                    <th className="px-4 py-2.5 font-normal">Membros</th>
                    <th className="py-2.5 pr-5 pl-4 text-right font-normal sm:pr-6">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {gruposRecentes.map((g) => (
                    <tr key={g.id} className="transition-colors hover:bg-subtle">
                      <td className="py-3 pr-4 pl-5 sm:pl-6">
                        <Link to={`/grupos/${g.id}`} className="text-[14px] font-semibold text-ink hover:text-primary hover:underline">
                          {g.nome}
                        </Link>
                        <p className="truncate text-[12.5px] text-muted">{g.bairro || g.municipio || 'Comunidade'}</p>
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-ink">
                        {nomeResponsavel(g.responsavelId)}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] text-ink">
                        {g.membroIds.length} {g.membroIds.length === 1 ? 'membro' : 'membros'}
                      </td>
                      <td className="py-3 pr-5 pl-4 text-right sm:pr-6">
                        <Selo tom={tomCadastro(g.situacao)}>{g.situacao}</Selo>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    onClick={() => {
                      if (!n.lida) void marcarComoLida(n.id);
                    }}
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
