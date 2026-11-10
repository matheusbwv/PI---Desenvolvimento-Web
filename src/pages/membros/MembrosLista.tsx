import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
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

export default function MembrosLista() {
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const membros = useDados((s) => s.membros);
  const alternarSituacao = useDados((s) => s.alternarSituacaoMembro);
  const excluir = useDados((s) => s.excluirMembro);
  const podeCriar = usePode('membros', 'criar');
  const podeEditar = usePode('membros', 'editar');
  const podeExcluir = usePode('membros', 'excluir');

  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('');
  const [bairro, setBairro] = useState('');

  const filtrados = useMemo(
    () =>
      membros
        .filter((m) => !busca || contemTexto(m.nome, busca) || m.codigo.includes(busca.trim()) || contemTexto(m.identificador, busca))
        .filter((m) => !situacao || m.situacao === situacao)
        .filter((m) => !bairro || m.bairro === bairro)
        .sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [membros, busca, situacao, bairro],
  );
  const paginacao = usePaginacao(filtrados);

  const pedirExclusao = async (id: string, nome: string) => {
    const ok = await confirmar({
      titulo: 'Excluir membro?',
      mensagem: `${nome} será removido(a) dos grupos e das inscrições. Essa ação não pode ser desfeita.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    excluir(id);
    toast.success('Membro excluído.');
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Membros da comunidade"
        subtitulo="Gerencie os membros, faça buscas e aplique filtros."
        acoes={
          podeCriar && (
            <BotaoLink to="/membros/novo" icone={Plus}>
              Novo membro
            </BotaoLink>
          )
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <CampoBusca
          className="w-full max-w-[420px]"
          placeholder="Pesquisar por nome ou identificador..."
          aria-label="Pesquisar membros"
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
            <Th className="w-20">#</Th>
            <Th>Nome</Th>
            <Th>Contato</Th>
            <Th>Território/Bairro</Th>
            <Th>Situação</Th>
            <Th className="w-24">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {paginacao.paginados.length === 0 && <LinhaVazia colunas={6} texto="Nenhum membro encontrado." />}
          {paginacao.paginados.map((m) => (
            <Tr key={m.id}>
              <Td>{m.codigo}</Td>
              <Td>
                <Link to={`/membros/${m.id}/editar`} className="hover:text-primary hover:underline">
                  {m.nome}
                </Link>
              </Td>
              <Td className="whitespace-nowrap">{m.telefone || m.email || '—'}</Td>
              <Td>{m.bairro || '—'}</Td>
              <Td>
                <Selo tom={tomCadastro(m.situacao)}>{m.situacao}</Selo>
              </Td>
              <Td>
                <MenuAcoes
                  rotulo={`Ações de ${m.nome}`}
                  acoes={[
                    { rotulo: podeEditar ? 'Editar' : 'Ver cadastro', icone: Pencil, aoClicar: () => navegar(`/membros/${m.id}/editar`) },
                    {
                      rotulo: m.situacao === 'Ativo' ? 'Inativar' : 'Reativar',
                      icone: Power,
                      oculto: !podeEditar,
                      aoClicar: () => {
                        alternarSituacao(m.id);
                        toast.success(m.situacao === 'Ativo' ? 'Membro inativado.' : 'Membro reativado.');
                      },
                    },
                    { rotulo: 'Excluir', icone: Trash2, perigo: true, oculto: !podeExcluir, aoClicar: () => pedirExclusao(m.id, m.nome) },
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
