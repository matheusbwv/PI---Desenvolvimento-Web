import { clsx } from 'clsx';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpCircle, Check, ClipboardCheck, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { JanelaInscricao } from '@/components/JanelaInscricao';
import { Botao, BotaoLink } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Cartao, CartaoComTitulo, Informacao } from '@/components/ui/Cartao';
import { useConfirmar } from '@/components/ui/Janela';
import { Selo } from '@/components/ui/Selo';
import { LinhaVazia, Tabela, Td, Th, Tr } from '@/components/ui/Tabela';
import { hojeISO } from '@/lib/formatacao';
import { origemAtividade, resumoVagas, tomAtividade } from '@/lib/regras';
import NaoEncontrada from '@/pages/NaoEncontrada';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';

export default function AtividadeDetalhes() {
  const { id } = useParams();
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const atividade = useDados((s) => s.atividades.find((a) => a.id === id));
  const grupos = useDados((s) => s.grupos);
  const membros = useDados((s) => s.membros);
  const inscricoes = useDados((s) => s.inscricoes);
  const excluir = useDados((s) => s.excluirAtividade);
  const cancelarInscricao = useDados((s) => s.cancelarInscricao);
  const promover = useDados((s) => s.promoverInscricao);
  const definirPresenca = useDados((s) => s.definirPresenca);
  const registrarPresenca = useDados((s) => s.registrarPresenca);
  const podeEditar = usePode('atividades', 'editar');
  const podeExcluir = usePode('atividades', 'excluir');
  const podeInscrever = usePode('inscricoes', 'criar');
  const podeGerirInscricoes = usePode('inscricoes', 'editar');
  const [inscrevendo, setInscrevendo] = useState(false);

  const daAtividade = useMemo(() => inscricoes.filter((i) => i.atividadeId === id), [inscricoes, id]);
  const confirmadas = daAtividade.filter((i) => i.situacao === 'Confirmada');
  const espera = daAtividade
    .filter((i) => i.situacao === 'Lista de espera')
    .sort((a, b) => a.criadaEm.localeCompare(b.criadaEm));

  if (!atividade) return <NaoEncontrada texto="Esta atividade não existe ou foi excluída." />;

  const vagas = resumoVagas(atividade, inscricoes);
  const membro = (membroId: string) => membros.find((m) => m.id === membroId);
  const encerrada = atividade.situacao === 'Cancelada';
  const podeRegistrarPresenca = atividade.data <= hojeISO() && !encerrada;
  const aceitaInscricao = !encerrada && atividade.situacao !== 'Concluída' && atividade.data >= hojeISO();
  const dataLonga = format(parseISO(atividade.data), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const pedirExclusao = async () => {
    const ok = await confirmar({
      titulo: 'Excluir atividade?',
      mensagem: `"${atividade.titulo}" e todas as suas inscrições serão excluídas. Essa ação não pode ser desfeita.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    excluir(atividade.id);
    toast.success('Atividade excluída.');
    navegar('/atividades');
  };

  const pedirCancelamento = async (inscricaoId: string, nome: string) => {
    const ok = await confirmar({
      titulo: 'Cancelar inscrição?',
      mensagem: `A inscrição de ${nome} será cancelada e a vaga ficará livre.`,
      confirmar: 'Cancelar inscrição',
      perigo: true,
    });
    if (!ok) return;
    cancelarInscricao(inscricaoId);
    toast.success('Inscrição cancelada.');
  };

  return (
    <>
      <CabecalhoPagina
        trilha={[{ rotulo: 'Atividades', para: '/atividades' }, { rotulo: 'Detalhes' }]}
        titulo={atividade.titulo}
        selo={<Selo tom={tomAtividade[atividade.situacao]}>{atividade.situacao}</Selo>}
        acoes={
          <>
            {podeEditar && (
              <BotaoLink to={`/atividades/${atividade.id}/editar`} variante="secundario">
                Editar
              </BotaoLink>
            )}
            {podeExcluir && (
              <Botao variante="perigo" onClick={pedirExclusao}>
                Excluir
              </Botao>
            )}
            {podeInscrever && aceitaInscricao && (
              <Botao icone={UserPlus} onClick={() => setInscrevendo(true)}>
                Inscrever membro
              </Botao>
            )}
          </>
        }
      />

      <Cartao className="mb-6 p-5 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Informacao rotulo="Data" valor={<span className="first-letter:uppercase">{dataLonga}</span>} />
          <Informacao rotulo="Horário" valor={`${atividade.horaInicio} - ${atividade.horaFim}`} />
          <Informacao rotulo="Local" valor={atividade.local || '—'} />
          <Informacao
            rotulo="Vagas"
            valor={
              <div>
                <span>
                  {vagas.confirmadas} de {atividade.vagas} ocupadas
                </span>
                <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-neutral-soft">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (vagas.confirmadas / atividade.vagas) * 100)}%` }}
                  />
                </div>
              </div>
            }
          />
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Informacao
            rotulo="Organização"
            valor={
              atividade.grupoId ? (
                <Link to={`/grupos/${atividade.grupoId}`} className="text-primary hover:underline">
                  {origemAtividade(atividade, grupos)}
                </Link>
              ) : (
                origemAtividade(atividade, grupos)
              )
            }
          />
          <Informacao rotulo="Lista de espera" valor={vagas.espera} />
          <Informacao rotulo="Frequência" valor={vagas.taxaPresenca === null ? '—' : `${vagas.taxaPresenca}%`} />
        </div>
        {atividade.descricao && (
          <div className="mt-5">
            <Informacao rotulo="Descrição" valor={atividade.descricao} />
          </div>
        )}
      </Cartao>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[16px] font-bold text-ink">Inscritos ({confirmadas.length})</h2>
            {podeGerirInscricoes && podeRegistrarPresenca && confirmadas.length > 0 && (
              <Botao
                variante="secundario"
                icone={ClipboardCheck}
                onClick={() => {
                  registrarPresenca(atividade.id);
                  toast.success('Presença registrada com sucesso.');
                }}
              >
                Registrar presença
              </Botao>
            )}
          </div>
          {!podeRegistrarPresenca && !encerrada && (
            <p className="mb-3 text-[13px] text-muted">A presença pode ser marcada a partir do dia da atividade.</p>
          )}
          <Tabela>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Contato</Th>
                <Th>Presença</Th>
                <Th className="w-24">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {confirmadas.length === 0 && <LinhaVazia colunas={4} texto="Nenhuma inscrição confirmada." />}
              {confirmadas.map((i) => {
                const m = membro(i.membroId);
                return (
                  <Tr key={i.id}>
                    <Td>{m?.nome ?? 'Membro removido'}</Td>
                    <Td className="whitespace-nowrap">{m?.telefone || '—'}</Td>
                    <Td>
                      <div className="inline-flex overflow-hidden rounded-md border border-line" role="group" aria-label="Presença">
                        {[
                          { valor: true, rotulo: 'Presente', icone: Check },
                          { valor: false, rotulo: 'Faltou', icone: X },
                        ].map(({ valor, rotulo, icone: Icone }) => (
                          <button
                            key={rotulo}
                            type="button"
                            disabled={!podeRegistrarPresenca || !podeGerirInscricoes}
                            aria-pressed={i.presente === valor}
                            onClick={() => definirPresenca(i.id, i.presente === valor ? null : valor)}
                            className={clsx(
                              'inline-flex h-7 cursor-pointer items-center gap-1 px-2.5 text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                              i.presente === valor
                                ? valor
                                  ? 'bg-success-soft text-success'
                                  : 'bg-danger-soft text-danger'
                                : 'bg-white text-muted hover:bg-subtle',
                              !valor && 'border-l border-line',
                            )}
                          >
                            <Icone className="size-3.5" aria-hidden />
                            {rotulo}
                          </button>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      {podeGerirInscricoes && !encerrada ? (
                        <button
                          type="button"
                          onClick={() => pedirCancelamento(i.id, m?.nome ?? 'membro')}
                          className="cursor-pointer text-[13px] text-danger hover:underline"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Tabela>
        </div>

        <CartaoComTitulo titulo={`Lista de espera (${espera.length})`} className="h-fit">
          {espera.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-muted">Ninguém na lista de espera.</p>
          ) : (
            <ol className="divide-y divide-line">
              {espera.map((i, posicao) => {
                const m = membro(i.membroId);
                return (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning-soft text-[12.5px] font-semibold text-warning">
                        {posicao + 1}º
                      </span>
                      <span className="truncate text-[14px] text-ink">{m?.nome ?? 'Membro removido'}</span>
                    </div>
                    {podeGerirInscricoes && (
                      <Botao
                        variante="contorno"
                        tamanho="sm"
                        icone={ArrowUpCircle}
                        disabled={vagas.livres === 0}
                        title={vagas.livres === 0 ? 'Não há vagas livres' : 'Confirmar inscrição'}
                        onClick={() => {
                          const r = promover(i.id);
                          if (r.ok) toast.success(r.mensagem);
                          else toast.error(r.erro);
                        }}
                      >
                        Promover
                      </Botao>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {vagas.livres > 0 && espera.length > 0 && (
            <p className="mt-2 rounded-lg bg-primary-soft px-3 py-2 text-[13px] text-brand">
              {vagas.livres} {vagas.livres === 1 ? 'vaga livre' : 'vagas livres'}: promova o primeiro da fila.
            </p>
          )}
        </CartaoComTitulo>
      </div>

      <JanelaInscricao aberta={inscrevendo} aoMudar={setInscrevendo} atividadeFixa={atividade.id} />
    </>
  );
}
