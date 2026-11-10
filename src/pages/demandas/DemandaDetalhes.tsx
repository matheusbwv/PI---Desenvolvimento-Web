import { clsx } from 'clsx';
import { CirclePlay, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Botao, BotaoLink } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Campo, Entrada, Selecao } from '@/components/ui/Campos';
import { Cartao, CartaoComTitulo, Informacao } from '@/components/ui/Cartao';
import { Janela, useConfirmar } from '@/components/ui/Janela';
import { MenuAcoes } from '@/components/ui/Menus';
import { Selo } from '@/components/ui/Selo';
import { formatarData } from '@/lib/formatacao';
import { SITUACOES_TAREFA } from '@/lib/opcoes';
import { progressoDemanda, situacaoDemanda, tomDemanda, tomPrioridade, tomTarefa } from '@/lib/regras';
import NaoEncontrada from '@/pages/NaoEncontrada';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';
import type { SituacaoTarefa, Tarefa } from '@/types';

export default function DemandaDetalhes() {
  const { id } = useParams();
  const confirmar = useConfirmar();
  const demanda = useDados((s) => s.demandas.find((d) => d.id === id));
  const usuarios = useDados((s) => s.usuarios);
  const grupos = useDados((s) => s.grupos);
  const alternarTarefa = useDados((s) => s.alternarTarefa);
  const definirSituacao = useDados((s) => s.definirSituacaoTarefa);
  const excluirTarefa = useDados((s) => s.excluirTarefa);
  const podeEditar = usePode('demandas', 'editar');
  const [janela, setJanela] = useState<{ aberta: boolean; tarefa?: Tarefa }>({ aberta: false });

  if (!demanda) return <NaoEncontrada texto="Esta demanda não existe ou foi excluída." />;

  const nome = (uid: string) => usuarios.find((u) => u.id === uid)?.nome ?? '—';
  const exibida = situacaoDemanda(demanda);
  const progresso = progressoDemanda(demanda);
  const grupo = grupos.find((g) => g.id === demanda.grupoId);

  const pedirExclusao = async (tarefa: Tarefa) => {
    const ok = await confirmar({
      titulo: 'Excluir tarefa?',
      mensagem: `A tarefa "${tarefa.titulo}" será removida da demanda.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    excluirTarefa(demanda.id, tarefa.id);
    toast.success('Tarefa excluída.');
  };

  return (
    <>
      <CabecalhoPagina
        trilha={[{ rotulo: 'Demandas', para: '/demandas' }, { rotulo: demanda.codigo }]}
        titulo={demanda.titulo}
        selo={<Selo tom={tomDemanda[exibida]}>{exibida}</Selo>}
        acoes={
          podeEditar && (
            <>
              <BotaoLink to={`/demandas/${demanda.id}/editar`} variante="secundario">
                Editar
              </BotaoLink>
              <Botao icone={Plus} onClick={() => setJanela({ aberta: true })}>
                Nova tarefa
              </Botao>
            </>
          )
        }
      />

      <Cartao className="mb-6 p-5 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Informacao rotulo="Responsável" valor={nome(demanda.responsavelId)} />
          <Informacao rotulo="Prioridade" valor={<Selo tom={tomPrioridade[demanda.prioridade]}>{demanda.prioridade}</Selo>} />
          <Informacao
            rotulo="Prazo"
            valor={<span className={clsx(exibida === 'Atrasada' && 'font-medium text-danger')}>{formatarData(demanda.prazo)}</span>}
          />
          <Informacao
            rotulo="Progresso"
            valor={
              <div>
                <span>{progresso}%</span>
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft"
                  role="progressbar"
                  aria-valuenow={progresso}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progresso}%` }} />
                </div>
              </div>
            }
          />
        </div>
        <div className="mt-5 grid gap-5 border-t border-line pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <Informacao rotulo="Categoria" valor={demanda.categoria || '—'} />
          <Informacao rotulo="Território/Bairro" valor={demanda.bairro || '—'} />
          <Informacao
            rotulo="Grupo relacionado"
            valor={
              grupo ? (
                <Link to={`/grupos/${grupo.id}`} className="text-primary hover:underline">
                  {grupo.nome}
                </Link>
              ) : (
                '—'
              )
            }
          />
          <Informacao rotulo="Aberta em" valor={formatarData(demanda.criadaEm)} />
          {demanda.descricao && (
            <div className="sm:col-span-2 xl:col-span-4">
              <Informacao rotulo="Descrição" valor={demanda.descricao} />
            </div>
          )}
        </div>
      </Cartao>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <CartaoComTitulo titulo={`Tarefas (${demanda.tarefas.length})`}>
          {demanda.tarefas.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-muted">Nenhuma tarefa cadastrada. Use “Nova tarefa” para dividir o trabalho.</p>
          ) : (
            <ul className="divide-y divide-line">
              {demanda.tarefas.map((t) => {
                const feita = t.situacao === 'Concluída';
                return (
                  <li key={t.id} className="flex items-center gap-3 py-3.5">
                    <input
                      type="checkbox"
                      checked={feita}
                      disabled={!podeEditar}
                      onChange={() => alternarTarefa(demanda.id, t.id)}
                      aria-label={feita ? `Reabrir tarefa ${t.titulo}` : `Concluir tarefa ${t.titulo}`}
                      className="size-[18px] shrink-0 cursor-pointer accent-primary disabled:cursor-default"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] text-ink">{t.titulo}</p>
                      <p className="text-[13px] text-muted">
                        {nome(t.responsavelId)} · {formatarData(t.prazo)}
                      </p>
                    </div>
                    <Selo tom={tomTarefa[t.situacao]}>{t.situacao}</Selo>
                    {podeEditar && (
                      <MenuAcoes
                        rotulo={`Ações da tarefa ${t.titulo}`}
                        acoes={[
                          {
                            rotulo: 'Marcar em andamento',
                            icone: CirclePlay,
                            oculto: t.situacao === 'Em andamento',
                            aoClicar: () => definirSituacao(demanda.id, t.id, 'Em andamento'),
                          },
                          {
                            rotulo: 'Voltar para pendente',
                            icone: RotateCcw,
                            oculto: t.situacao === 'Pendente',
                            aoClicar: () => definirSituacao(demanda.id, t.id, 'Pendente'),
                          },
                          { rotulo: 'Editar', icone: Pencil, aoClicar: () => setJanela({ aberta: true, tarefa: t }) },
                          { rotulo: 'Excluir', icone: Trash2, perigo: true, aoClicar: () => pedirExclusao(t) },
                        ]}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CartaoComTitulo>

        <CartaoComTitulo titulo="Histórico" className="h-fit">
          <ol className="mt-4 ml-1 space-y-5 border-l-2 border-line pl-6">
            {demanda.historico.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute top-1.5 -left-[31px] size-2.5 rounded-full border-2 border-white bg-primary" aria-hidden />
                <p className="text-[14px] font-bold text-ink">{h.titulo}</p>
                <p className="text-[13px] text-muted">
                  {h.detalhe} · {formatarData(h.data)}
                </p>
              </li>
            ))}
          </ol>
        </CartaoComTitulo>
      </div>

      <JanelaTarefa
        key={janela.tarefa?.id ?? 'nova'}
        aberta={janela.aberta}
        aoMudar={(aberta) => setJanela((j) => ({ ...j, aberta }))}
        demandaId={demanda.id}
        tarefa={janela.tarefa}
      />
    </>
  );
}

function JanelaTarefa({
  aberta,
  aoMudar,
  demandaId,
  tarefa,
}: {
  aberta: boolean;
  aoMudar: (v: boolean) => void;
  demandaId: string;
  tarefa?: Tarefa;
}) {
  const usuarios = useDados((s) => s.usuarios);
  const salvarTarefa = useDados((s) => s.salvarTarefa);
  const [titulo, setTitulo] = useState(tarefa?.titulo ?? '');
  const [responsavelId, setResponsavelId] = useState(tarefa?.responsavelId ?? '');
  const [prazo, setPrazo] = useState(tarefa?.prazo ?? '');
  const [situacao, setSituacao] = useState<SituacaoTarefa>(tarefa?.situacao ?? 'Pendente');
  const [erro, setErro] = useState('');

  const salvar = () => {
    if (titulo.trim().length < 3) return setErro('Informe o título da tarefa (mínimo de 3 letras).');
    salvarTarefa(demandaId, { titulo: titulo.trim(), responsavelId, prazo, situacao }, tarefa?.id);
    toast.success(tarefa ? 'Tarefa atualizada.' : 'Tarefa adicionada.');
    aoMudar(false);
    if (!tarefa) {
      setTitulo('');
      setResponsavelId('');
      setPrazo('');
      setSituacao('Pendente');
    }
  };

  return (
    <Janela
      aberta={aberta}
      aoMudar={(v) => {
        aoMudar(v);
        setErro('');
      }}
      titulo={tarefa ? 'Editar tarefa' : 'Nova tarefa'}
      descricao="Divida a demanda em passos com responsável e prazo."
      rodape={
        <>
          <Botao variante="secundario" onClick={() => aoMudar(false)}>
            Cancelar
          </Botao>
          <Botao onClick={salvar}>Salvar</Botao>
        </>
      }
    >
      <div className="space-y-4">
        <Campo rotulo="Título" obrigatorio htmlFor="tarefa-titulo" erro={erro}>
          <Entrada
            id="tarefa-titulo"
            value={titulo}
            placeholder="Ex.: Levantar orçamento"
            aria-invalid={!!erro}
            onChange={(e) => {
              setTitulo(e.target.value);
              setErro('');
            }}
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Responsável" htmlFor="tarefa-resp">
            <Selecao id="tarefa-resp" placeholder="Selecione..." value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
              {usuarios
                .filter((u) => u.situacao === 'Ativo' || u.id === tarefa?.responsavelId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Prazo" htmlFor="tarefa-prazo">
            <Entrada id="tarefa-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Campo>
        </div>
        <Campo rotulo="Situação" htmlFor="tarefa-sit">
          <Selecao id="tarefa-sit" value={situacao} onChange={(e) => setSituacao(e.target.value as SituacaoTarefa)}>
            {SITUACOES_TAREFA.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Selecao>
        </Campo>
      </div>
    </Janela>
  );
}
