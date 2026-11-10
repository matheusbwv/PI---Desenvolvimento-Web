import { Eye, Plus, UserMinus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Abas } from '@/components/ui/Abas';
import { Botao, BotaoLink } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { CaixaMarcacao, CampoBusca } from '@/components/ui/Campos';
import { Cartao, Informacao } from '@/components/ui/Cartao';
import { Janela, useConfirmar } from '@/components/ui/Janela';
import { MenuAcoes } from '@/components/ui/Menus';
import { Selo } from '@/components/ui/Selo';
import { LinhaVazia, Tabela, Td, Th, Tr } from '@/components/ui/Tabela';
import { contemTexto, formatarData, formatarTamanho } from '@/lib/formatacao';
import { resumoVagas, tomArquivo, tomAtividade, tomCadastro } from '@/lib/regras';
import NaoEncontrada from '@/pages/NaoEncontrada';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';

type Aba = 'descricao' | 'membros' | 'atividades' | 'documentos';

const Info = Informacao;

export default function GrupoDetalhes() {
  const { id } = useParams();
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const grupo = useDados((s) => s.grupos.find((g) => g.id === id));
  const usuarios = useDados((s) => s.usuarios);
  const membros = useDados((s) => s.membros);
  const atividades = useDados((s) => s.atividades);
  const inscricoes = useDados((s) => s.inscricoes);
  const documentos = useDados((s) => s.documentos);
  const alternarSituacao = useDados((s) => s.alternarSituacaoGrupo);
  const removerMembro = useDados((s) => s.removerMembroDoGrupo);
  const podeEditar = usePode('grupos', 'editar');
  const podeCriarAtividade = usePode('atividades', 'criar');

  const [aba, setAba] = useState<Aba>('membros');
  const [adicionando, setAdicionando] = useState(false);

  const membrosDoGrupo = useMemo(
    () => membros.filter((m) => grupo?.membroIds.includes(m.id)).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [membros, grupo],
  );
  const atividadesDoGrupo = useMemo(
    () => atividades.filter((a) => a.grupoId === id).sort((a, b) => b.data.localeCompare(a.data)),
    [atividades, id],
  );
  const documentosDoGrupo = documentos.filter((d) => d.vinculo.tipo === 'grupo' && d.vinculo.id === id);

  if (!grupo) return <NaoEncontrada texto="Este grupo não existe ou foi excluído." />;

  const responsavel = usuarios.find((u) => u.id === grupo.responsavelId)?.nome ?? '—';

  const desativar = async () => {
    if (grupo.situacao === 'Ativo') {
      const ok = await confirmar({
        titulo: 'Desativar grupo?',
        mensagem: `O grupo "${grupo.nome}" ficará inativo. Você pode reativá-lo depois.`,
        confirmar: 'Desativar',
        perigo: true,
      });
      if (!ok) return;
    }
    alternarSituacao(grupo.id);
    toast.success(grupo.situacao === 'Ativo' ? 'Grupo desativado.' : 'Grupo reativado.');
  };

  return (
    <>
      <CabecalhoPagina
        trilha={[{ rotulo: 'Grupos', para: '/grupos' }, { rotulo: 'Detalhes' }]}
        titulo={grupo.nome}
        selo={<Selo tom={tomCadastro(grupo.situacao)}>{grupo.situacao}</Selo>}
        acoes={
          podeEditar && (
            <>
              <BotaoLink to={`/grupos/${grupo.id}/editar`} variante="secundario">
                Editar
              </BotaoLink>
              <Botao variante={grupo.situacao === 'Ativo' ? 'perigo' : 'secundario'} onClick={desativar}>
                {grupo.situacao === 'Ativo' ? 'Desativar' : 'Reativar'}
              </Botao>
            </>
          )
        }
      />

      <Cartao className="mb-6 p-5 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Info rotulo="Responsável" valor={responsavel} />
          <Info rotulo="Membros" valor={grupo.membroIds.length} />
          <Info rotulo="Território" valor={grupo.bairro || '—'} />
          <Info rotulo="Criado em" valor={formatarData(grupo.criadoEm)} />
        </div>
        <div className="mt-5">
          <Info rotulo="Objetivo" valor={grupo.objetivo || 'Nenhum objetivo informado.'} />
        </div>
      </Cartao>

      <Abas<Aba>
        ativa={aba}
        aoMudar={setAba}
        itens={[
          { id: 'descricao', rotulo: 'Descrição' },
          { id: 'membros', rotulo: 'Membros' },
          { id: 'atividades', rotulo: 'Atividades' },
          { id: 'documentos', rotulo: 'Documentos' },
        ]}
      />

      {aba === 'descricao' && (
        <Cartao className="p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Info rotulo="Código do grupo" valor={grupo.codigo} />
            <Info rotulo="Município" valor={grupo.municipio || '—'} />
            <Info rotulo="Bairro" valor={grupo.bairro || '—'} />
            <Info rotulo="Atividades registradas" valor={atividadesDoGrupo.length} />
          </div>
          <div className="mt-5 border-t border-line pt-5">
            <Info rotulo="Objetivo do grupo" valor={grupo.objetivo || 'Nenhum objetivo informado.'} />
          </div>
        </Cartao>
      )}

      {aba === 'membros' && (
        <>
          {podeEditar && (
            <div className="mb-4 flex justify-end">
              <Botao variante="secundario" icone={UserPlus} onClick={() => setAdicionando(true)}>
                Adicionar membros
              </Botao>
            </div>
          )}
          <Tabela>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Contato</Th>
                <Th>Território/Bairro</Th>
                <Th>Situação</Th>
                <Th className="w-24">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {membrosDoGrupo.length === 0 && <LinhaVazia colunas={5} texto="Este grupo ainda não tem membros." />}
              {membrosDoGrupo.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    <Link to={`/membros/${m.id}/editar`} className="hover:text-primary hover:underline">
                      {m.nome}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap">{m.telefone || '—'}</Td>
                  <Td>{m.bairro || '—'}</Td>
                  <Td>
                    <Selo tom={tomCadastro(m.situacao)}>{m.situacao}</Selo>
                  </Td>
                  <Td>
                    <MenuAcoes
                      acoes={[
                        { rotulo: 'Ver cadastro', icone: Eye, aoClicar: () => navegar(`/membros/${m.id}/editar`) },
                        {
                          rotulo: 'Remover do grupo',
                          icone: UserMinus,
                          perigo: true,
                          oculto: !podeEditar,
                          aoClicar: () => {
                            removerMembro(grupo.id, m.id);
                            toast.success(`${m.nome} foi removido(a) do grupo.`);
                          },
                        },
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Tabela>
          <JanelaAdicionarMembros aberta={adicionando} aoMudar={setAdicionando} grupoId={grupo.id} jaNoGrupo={grupo.membroIds} />
        </>
      )}

      {aba === 'atividades' && (
        <>
          {podeCriarAtividade && grupo.situacao === 'Ativo' && (
            <div className="mb-4 flex justify-end">
              <BotaoLink to={`/atividades/nova?grupo=${grupo.id}`} icone={Plus}>
                Nova atividade
              </BotaoLink>
            </div>
          )}
          <Tabela>
            <thead>
              <tr>
                <Th>Atividade</Th>
                <Th>Data</Th>
                <Th>Horário</Th>
                <Th>Inscritos</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {atividadesDoGrupo.length === 0 && <LinhaVazia colunas={5} texto="Nenhuma atividade deste grupo." />}
              {atividadesDoGrupo.map((a) => {
                const vagas = resumoVagas(a, inscricoes);
                return (
                  <Tr key={a.id}>
                    <Td>
                      <Link to={`/atividades/${a.id}`} className="hover:text-primary hover:underline">
                        {a.titulo}
                      </Link>
                    </Td>
                    <Td>{formatarData(a.data)}</Td>
                    <Td className="whitespace-nowrap">
                      {a.horaInicio} - {a.horaFim}
                    </Td>
                    <Td>
                      {vagas.confirmadas}/{a.vagas}
                    </Td>
                    <Td>
                      <Selo tom={tomAtividade[a.situacao]}>{a.situacao}</Selo>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Tabela>
        </>
      )}

      {aba === 'documentos' && (
        <>
          <div className="mb-4 flex justify-end">
            <BotaoLink to="/relatorios/documentos" variante="secundario">
              Ir para Documentos
            </BotaoLink>
          </div>
          <Tabela>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Tipo</Th>
                <Th>Enviado por</Th>
                <Th>Data</Th>
                <Th>Tamanho</Th>
              </tr>
            </thead>
            <tbody>
              {documentosDoGrupo.length === 0 && <LinhaVazia colunas={5} texto="Nenhum documento vinculado a este grupo." />}
              {documentosDoGrupo.map((d) => (
                <Tr key={d.id}>
                  <Td>{d.nome}</Td>
                  <Td>
                    <Selo tom={tomArquivo[d.tipo]}>{d.tipo}</Selo>
                  </Td>
                  <Td>{d.enviadoPor}</Td>
                  <Td>{formatarData(d.data)}</Td>
                  <Td>{formatarTamanho(d.tamanho)}</Td>
                </Tr>
              ))}
            </tbody>
          </Tabela>
        </>
      )}
    </>
  );
}

function JanelaAdicionarMembros({
  aberta,
  aoMudar,
  grupoId,
  jaNoGrupo,
}: {
  aberta: boolean;
  aoMudar: (v: boolean) => void;
  grupoId: string;
  jaNoGrupo: string[];
}) {
  const membros = useDados((s) => s.membros);
  const adicionar = useDados((s) => s.adicionarMembrosAoGrupo);
  const [busca, setBusca] = useState('');
  const [marcados, setMarcados] = useState<string[]>([]);

  const disponiveis = membros
    .filter((m) => !jaNoGrupo.includes(m.id) && m.situacao === 'Ativo')
    .filter((m) => !busca || contemTexto(m.nome, busca))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const fechar = (v: boolean) => {
    aoMudar(v);
    if (!v) {
      setMarcados([]);
      setBusca('');
    }
  };

  return (
    <Janela
      aberta={aberta}
      aoMudar={fechar}
      titulo="Adicionar membros ao grupo"
      descricao="Selecione os membros ativos que vão participar do grupo."
      rodape={
        <>
          <Botao variante="secundario" onClick={() => fechar(false)}>
            Cancelar
          </Botao>
          <Botao
            disabled={marcados.length === 0}
            onClick={() => {
              adicionar(grupoId, marcados);
              toast.success(`${marcados.length} membro(s) adicionado(s) ao grupo.`);
              fechar(false);
            }}
          >
            Adicionar {marcados.length > 0 && `(${marcados.length})`}
          </Botao>
        </>
      }
    >
      <CampoBusca placeholder="Buscar membro..." aria-label="Buscar membro" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <ul className="mt-3 max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
        {disponiveis.length === 0 && <li className="px-4 py-6 text-center text-[14px] text-muted">Nenhum membro disponível.</li>}
        {disponiveis.map((m) => (
          <li key={m.id} className="px-4 py-2.5 hover:bg-subtle">
            <CaixaMarcacao
              checked={marcados.includes(m.id)}
              onChange={(e) =>
                setMarcados((atual) => (e.target.checked ? [...atual, m.id] : atual.filter((x) => x !== m.id)))
              }
              rotulo={
                <span>
                  {m.nome} <span className="text-muted">· {m.bairro}</span>
                </span>
              }
              className="w-full"
            />
          </li>
        ))}
      </ul>
    </Janela>
  );
}
