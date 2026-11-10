import { Eye, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { BotaoLink } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { CampoBusca } from '@/components/ui/Campos';
import { useConfirmar } from '@/components/ui/Janela';
import { MenuAcoes, MenuFiltros } from '@/components/ui/Menus';
import { Selo } from '@/components/ui/Selo';
import { LinhaVazia, Paginacao, Tabela, Td, Th, Tr, usePaginacao } from '@/components/ui/Tabela';
import { contemTexto } from '@/lib/formatacao';
import { BAIRROS, SITUACOES_CADASTRO } from '@/lib/opcoes';
import { tomCadastro } from '@/lib/regras';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';

export default function GruposLista() {
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const grupos = useDados((s) => s.grupos);
  const usuarios = useDados((s) => s.usuarios);
  const alternarSituacao = useDados((s) => s.alternarSituacaoGrupo);
  const excluir = useDados((s) => s.excluirGrupo);
  const podeCriar = usePode('grupos', 'criar');
  const podeEditar = usePode('grupos', 'editar');
  const podeExcluir = usePode('grupos', 'excluir');

  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [bairro, setBairro] = useState('');

  const filtrados = useMemo(
    () =>
      grupos
        .filter((g) => !busca || contemTexto(g.nome, busca))
        .filter((g) => !situacao || g.situacao === situacao)
        .filter((g) => !bairro || g.bairro === bairro)
        .sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [grupos, busca, situacao, bairro],
  );
  const paginacao = usePaginacao(filtrados);
  const nomeResponsavel = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '—';

  const pedirExclusao = async (id: string, nome: string) => {
    const ok = await confirmar({
      titulo: 'Excluir grupo?',
      mensagem: `O grupo "${nome}" será excluído. As atividades e demandas ligadas a ele serão mantidas, mas sem grupo.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    excluir(id);
    toast.success('Grupo excluído.');
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Grupos comunitários"
        subtitulo="Cadastre, gerencie e acompanhe os grupos da comunidade."
        acoes={
          podeCriar && (
            <BotaoLink to="/grupos/novo" icone={Plus}>
              Novo grupo
            </BotaoLink>
          )
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <CampoBusca
          className="w-full max-w-[420px]"
          placeholder="Pesquisar por nome do grupo..."
          aria-label="Pesquisar grupos"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <MenuFiltros
          secoes={[
            { id: 'situacao', rotulo: 'Situação', valor: situacao, opcoes: [...SITUACOES_CADASTRO], aoMudar: setSituacao },
            { id: 'bairro', rotulo: 'Território/Bairro', valor: bairro, opcoes: BAIRROS, aoMudar: setBairro },
          ]}
          aoLimpar={() => {
            setSituacao('');
            setBairro('');
          }}
        />
      </div>

      <Tabela rodape={<Paginacao {...paginacao} />}>
        <thead>
          <tr>
            <Th className="w-16">#</Th>
            <Th>Nome do grupo</Th>
            <Th>Objetivo</Th>
            <Th>Responsável</Th>
            <Th>Membros</Th>
            <Th>Situação</Th>
            <Th className="w-24">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {paginacao.paginados.length === 0 && <LinhaVazia colunas={7} texto="Nenhum grupo encontrado." />}
          {paginacao.paginados.map((g) => (
            <Tr key={g.id}>
              <Td>{g.codigo}</Td>
              <Td className="whitespace-nowrap">
                <Link to={`/grupos/${g.id}`} className="hover:text-primary hover:underline">
                  {g.nome}
                </Link>
              </Td>
              <Td>
                <span className="block max-w-[280px] truncate" title={g.objetivo}>
                  {g.objetivo || '—'}
                </span>
              </Td>
              <Td className="whitespace-nowrap">{nomeResponsavel(g.responsavelId)}</Td>
              <Td>{g.membroIds.length}</Td>
              <Td>
                <Selo tom={tomCadastro(g.situacao)}>{g.situacao}</Selo>
              </Td>
              <Td>
                <MenuAcoes
                  rotulo={`Ações de ${g.nome}`}
                  acoes={[
                    { rotulo: 'Ver detalhes', icone: Eye, aoClicar: () => navegar(`/grupos/${g.id}`) },
                    { rotulo: 'Editar', icone: Pencil, oculto: !podeEditar, aoClicar: () => navegar(`/grupos/${g.id}/editar`) },
                    {
                      rotulo: g.situacao === 'Ativo' ? 'Desativar' : 'Reativar',
                      icone: Power,
                      oculto: !podeEditar,
                      aoClicar: () => {
                        alternarSituacao(g.id);
                        toast.success(g.situacao === 'Ativo' ? 'Grupo desativado.' : 'Grupo reativado.');
                      },
                    },
                    { rotulo: 'Excluir', icone: Trash2, perigo: true, oculto: !podeExcluir, aoClicar: () => pedirExclusao(g.id, g.nome) },
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
