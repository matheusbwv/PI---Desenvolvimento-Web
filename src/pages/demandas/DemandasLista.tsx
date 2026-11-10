import { clsx } from 'clsx';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { BotaoLink } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { CampoBusca } from '@/components/ui/Campos';
import { CartaoNumero } from '@/components/ui/Cartao';
import { useConfirmar } from '@/components/ui/Janela';
import { FiltroSelecao, MenuAcoes } from '@/components/ui/Menus';
import { Selo } from '@/components/ui/Selo';
import { LinhaVazia, Paginacao, Tabela, Td, Th, Tr, usePaginacao } from '@/components/ui/Tabela';
import { contemTexto, formatarData, hojeISO } from '@/lib/formatacao';
import { PRIORIDADES } from '@/lib/opcoes';
import { situacaoDemanda, tomDemanda, tomPrioridade } from '@/lib/regras';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';
import type { SituacaoDemandaExibida } from '@/types';

const SITUACOES: SituacaoDemandaExibida[] = ['Aberta', 'Em andamento', 'Concluída', 'Atrasada'];

export default function DemandasLista() {
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const demandas = useDados((s) => s.demandas);
  const usuarios = useDados((s) => s.usuarios);
  const excluir = useDados((s) => s.excluirDemanda);
  const podeCriar = usePode('demandas', 'criar');
  const podeEditar = usePode('demandas', 'editar');
  const podeExcluir = usePode('demandas', 'excluir');

  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [prioridade, setPrioridade] = useState('');
  const hoje = hojeISO();

  const comSituacao = useMemo(() => demandas.map((d) => ({ ...d, exibida: situacaoDemanda(d, hoje) })), [demandas, hoje]);

  const numeros = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 90);
    const desde = limite.toISOString().slice(0, 10);
    return {
      abertas: comSituacao.filter((d) => d.exibida === 'Aberta').length,
      andamento: comSituacao.filter((d) => d.exibida === 'Em andamento').length,
      concluidas: comSituacao.filter((d) => d.exibida === 'Concluída' && d.concluidaEm >= desde).length,
      atrasadas: comSituacao.filter((d) => d.exibida === 'Atrasada').length,
    };
  }, [comSituacao]);

  const filtradas = useMemo(
    () =>
      comSituacao
        .filter((d) => !busca || contemTexto(d.titulo, busca) || contemTexto(d.codigo, busca))
        .filter((d) => !situacao || d.exibida === situacao)
        .filter((d) => !prioridade || d.prioridade === prioridade)
        .sort((a, b) => b.codigo.localeCompare(a.codigo)),
    [comSituacao, busca, situacao, prioridade],
  );
  const paginacao = usePaginacao(filtradas);
  const nome = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '—';

  const pedirExclusao = async (id: string, codigo: string) => {
    const ok = await confirmar({
      titulo: 'Excluir demanda?',
      mensagem: `A demanda ${codigo}, suas tarefas e o histórico serão excluídos.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    excluir(id);
    toast.success('Demanda excluída.');
  };

  const cartoes: { situacao: SituacaoDemandaExibida; rotulo: string; valor: number; detalhe: string }[] = [
    { situacao: 'Aberta', rotulo: 'Abertas', valor: numeros.abertas, detalhe: 'Aguardando início' },
    { situacao: 'Em andamento', rotulo: 'Em andamento', valor: numeros.andamento, detalhe: 'Com tarefas ativas' },
    { situacao: 'Concluída', rotulo: 'Concluídas', valor: numeros.concluidas, detalhe: 'Nos últimos 90 dias' },
    { situacao: 'Atrasada', rotulo: 'Atrasadas', valor: numeros.atrasadas, detalhe: 'Prazo vencido' },
  ];

  return (
    <>
      <CabecalhoPagina
        titulo="Demandas"
        subtitulo="Registre e acompanhe as demandas da comunidade."
        acoes={
          podeCriar && (
            <BotaoLink to="/demandas/nova" icone={Plus}>
              Nova demanda
            </BotaoLink>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cartoes.map((c) => (
          <button
            key={c.situacao}
            type="button"
            onClick={() => setSituacao(situacao === c.situacao ? '' : c.situacao)}
            aria-pressed={situacao === c.situacao}
            title={`Filtrar demandas: ${c.rotulo.toLowerCase()}`}
            className={clsx('cursor-pointer rounded-xl text-left', situacao === c.situacao && 'ring-2 ring-primary')}
          >
            <CartaoNumero
              rotulo={c.rotulo}
              valor={c.valor}
              detalhe={c.detalhe}
              valorClassName={c.situacao === 'Atrasada' ? 'text-danger' : undefined}
            />
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <CampoBusca
          className="w-full max-w-[380px]"
          placeholder="Pesquisar por título ou código..."
          aria-label="Pesquisar demandas"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <FiltroSelecao rotulo="Situação" valor={situacao} opcoes={SITUACOES} aoMudar={setSituacao} rotuloTodos="Todas" />
        <FiltroSelecao rotulo="Prioridade" valor={prioridade} opcoes={PRIORIDADES} aoMudar={setPrioridade} rotuloTodos="Todas" />
      </div>

      <Tabela rodape={<Paginacao {...paginacao} />}>
        <thead>
          <tr>
            <Th>Código</Th>
            <Th>Título</Th>
            <Th>Categoria</Th>
            <Th>Prioridade</Th>
            <Th>Responsável</Th>
            <Th>Prazo</Th>
            <Th>Situação</Th>
            <Th className="w-20">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {paginacao.paginados.length === 0 && <LinhaVazia colunas={8} texto="Nenhuma demanda encontrada." />}
          {paginacao.paginados.map((d) => (
            <Tr key={d.id}>
              <Td className="whitespace-nowrap">{d.codigo}</Td>
              <Td>
                <Link to={`/demandas/${d.id}`} className="hover:text-primary hover:underline">
                  {d.titulo}
                </Link>
              </Td>
              <Td>{d.categoria || '—'}</Td>
              <Td>
                <Selo tom={tomPrioridade[d.prioridade]}>{d.prioridade}</Selo>
              </Td>
              <Td className="whitespace-nowrap">{nome(d.responsavelId)}</Td>
              <Td className="whitespace-nowrap">{formatarData(d.prazo)}</Td>
              <Td>
                <Selo tom={tomDemanda[d.exibida]}>{d.exibida}</Selo>
              </Td>
              <Td>
                <MenuAcoes
                  rotulo={`Ações da demanda ${d.codigo}`}
                  acoes={[
                    { rotulo: 'Ver detalhes', icone: Eye, aoClicar: () => navegar(`/demandas/${d.id}`) },
                    { rotulo: 'Editar', icone: Pencil, oculto: !podeEditar, aoClicar: () => navegar(`/demandas/${d.id}/editar`) },
                    { rotulo: 'Excluir', icone: Trash2, perigo: true, oculto: !podeExcluir, aoClicar: () => pedirExclusao(d.id, d.codigo) },
                  ]}
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Tabela>
    </>
  );
}
