import { ArrowUpCircle, Eye, Plus, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { JanelaInscricao } from '@/components/JanelaInscricao';
import { Abas } from '@/components/ui/Abas';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { CampoBusca } from '@/components/ui/Campos';
import { CartaoNumero } from '@/components/ui/Cartao';
import { useConfirmar } from '@/components/ui/Janela';
import { FiltroSelecao, MenuAcoes } from '@/components/ui/Menus';
import { Selo } from '@/components/ui/Selo';
import { LinhaVazia, Paginacao, Tabela, Td, Th, Tr, usePaginacao } from '@/components/ui/Tabela';
import { contemTexto, formatarData, hojeISO } from '@/lib/formatacao';
import { resumoVagas, tomInscricao } from '@/lib/regras';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';
import type { SituacaoInscricao } from '@/types';

type Aba = 'Confirmada' | 'Lista de espera' | 'Cancelada';

export default function Inscricoes() {
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const inscricoes = useDados((s) => s.inscricoes);
  const atividades = useDados((s) => s.atividades);
  const membros = useDados((s) => s.membros);
  const cancelar = useDados((s) => s.cancelarInscricao);
  const promover = useDados((s) => s.promoverInscricao);
  const podeCriar = usePode('inscricoes', 'criar');
  const podeEditar = usePode('inscricoes', 'editar');

  const [aba, setAba] = useState<Aba>('Confirmada');
  const [busca, setBusca] = useState('');
  const [atividadeId, setAtividadeId] = useState('');
  const [inscrevendo, setInscrevendo] = useState(false);
  const hoje = hojeISO();

  const numeros = useMemo(() => {
    const futuras = atividades.filter((a) => a.data >= hoje && a.situacao !== 'Cancelada');
    const idsFuturas = new Set(futuras.map((a) => a.id));
    const ativas = inscricoes.filter((i) => idsFuturas.has(i.atividadeId));
    const realizadas = inscricoes.filter((i) => i.situacao === 'Confirmada' && i.presente !== null);
    return {
      confirmadas: ativas.filter((i) => i.situacao === 'Confirmada').length,
      espera: ativas.filter((i) => i.situacao === 'Lista de espera').length,
      livres: futuras.reduce((soma, a) => soma + resumoVagas(a, inscricoes).livres, 0),
      frequencia: realizadas.length
        ? Math.round((realizadas.filter((i) => i.presente).length / realizadas.length) * 100)
        : null,
    };
  }, [atividades, inscricoes, hoje]);

  const contagem = (s: SituacaoInscricao) => inscricoes.filter((i) => i.situacao === s).length;

  const linhas = useMemo(
    () =>
      inscricoes
        .filter((i) => i.situacao === aba)
        .filter((i) => !atividadeId || i.atividadeId === atividadeId)
        .map((i) => ({
          inscricao: i,
          membro: membros.find((m) => m.id === i.membroId),
          atividade: atividades.find((a) => a.id === i.atividadeId),
        }))
        .filter((l) => !busca || contemTexto(l.membro?.nome ?? '', busca) || contemTexto(l.atividade?.titulo ?? '', busca))
        .sort((a, b) => (b.atividade?.data ?? '').localeCompare(a.atividade?.data ?? '') || a.inscricao.criadaEm.localeCompare(b.inscricao.criadaEm)),
    [inscricoes, membros, atividades, aba, atividadeId, busca],
  );
  const paginacao = usePaginacao(linhas, 8);

  const opcoesAtividade = [...atividades]
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((a) => ({ valor: a.id, rotulo: `${a.titulo} (${formatarData(a.data)})` }));

  const pedirCancelamento = async (id: string, nome: string) => {
    const ok = await confirmar({
      titulo: 'Cancelar inscrição?',
      mensagem: `A inscrição de ${nome} será cancelada.`,
      confirmar: 'Cancelar inscrição',
      perigo: true,
    });
    if (!ok) return;
    cancelar(id);
    toast.success('Inscrição cancelada.');
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Inscrições e presença"
        subtitulo="Acompanhe as inscrições, a lista de espera e a frequência nas atividades."
        acoes={
          podeCriar && (
            <Botao icone={Plus} onClick={() => setInscrevendo(true)}>
              Nova inscrição
            </Botao>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoNumero rotulo="Inscrições confirmadas" valor={numeros.confirmadas} detalhe="Nas próximas atividades" />
        <CartaoNumero rotulo="Lista de espera" valor={numeros.espera} detalhe="Aguardando vaga" />
        <CartaoNumero rotulo="Vagas disponíveis" valor={numeros.livres} detalhe="Somando as próximas atividades" />
        <CartaoNumero
          rotulo="Frequência média"
          valor={numeros.frequencia === null ? '—' : `${numeros.frequencia}%`}
          detalhe="Presença nas atividades realizadas"
        />
      </div>

      <Abas<Aba>
        ativa={aba}
        aoMudar={setAba}
        itens={[
          { id: 'Confirmada', rotulo: 'Confirmadas', contagem: contagem('Confirmada') },
          { id: 'Lista de espera', rotulo: 'Lista de espera', contagem: contagem('Lista de espera') },
          { id: 'Cancelada', rotulo: 'Canceladas', contagem: contagem('Cancelada') },
        ]}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <CampoBusca
          className="w-full max-w-[420px]"
          placeholder="Pesquisar por membro ou atividade..."
          aria-label="Pesquisar inscrições"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <FiltroSelecao rotulo="Atividade" valor={atividadeId} opcoes={opcoesAtividade} aoMudar={setAtividadeId} rotuloTodos="Todas" />
      </div>

      <Tabela rodape={<Paginacao {...paginacao} rotulo="inscrições" />}>
        <thead>
          <tr>
            <Th>Membro</Th>
            <Th>Atividade</Th>
            <Th>Data</Th>
            <Th>Inscrito em</Th>
            <Th>Situação</Th>
            <Th>Presença</Th>
            <Th className="w-24">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {paginacao.paginados.length === 0 && <LinhaVazia colunas={7} texto="Nenhuma inscrição encontrada." />}
          {paginacao.paginados.map(({ inscricao: i, membro, atividade }) => {
            const futura = (atividade?.data ?? '') >= hoje;
            return (
              <Tr key={i.id}>
                <Td>{membro?.nome ?? 'Membro removido'}</Td>
                <Td>
                  {atividade ? (
                    <Link to={`/atividades/${atividade.id}`} className="hover:text-primary hover:underline">
                      {atividade.titulo}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="whitespace-nowrap">{formatarData(atividade?.data)}</Td>
                <Td className="whitespace-nowrap">{formatarData(i.criadaEm.slice(0, 10))}</Td>
                <Td>
                  <Selo tom={tomInscricao[i.situacao]}>{i.situacao}</Selo>
                </Td>
                <Td>
                  {i.presente === null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <Selo tom={i.presente ? 'verde' : 'vermelho'}>{i.presente ? 'Presente' : 'Faltou'}</Selo>
                  )}
                </Td>
                <Td>
                  <MenuAcoes
                    acoes={[
                      { rotulo: 'Ver atividade', icone: Eye, aoClicar: () => navegar(`/atividades/${i.atividadeId}`) },
                      {
                        rotulo: 'Promover para confirmada',
                        icone: ArrowUpCircle,
                        oculto: !podeEditar || i.situacao !== 'Lista de espera',
                        aoClicar: () => {
                          const r = promover(i.id);
                          if (r.ok) toast.success(r.mensagem);
                          else toast.error(r.erro);
                        },
                      },
                      {
                        rotulo: 'Cancelar inscrição',
                        icone: XCircle,
                        perigo: true,
                        oculto: !podeEditar || i.situacao === 'Cancelada' || !futura,
                        aoClicar: () => pedirCancelamento(i.id, membro?.nome ?? 'membro'),
                      },
                    ]}
                  />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Tabela>

      <JanelaInscricao aberta={inscrevendo} aoMudar={setInscrevendo} />
    </>
  );
}
