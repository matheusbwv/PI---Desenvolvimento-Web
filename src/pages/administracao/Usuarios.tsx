import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Abas } from '@/components/ui/Abas';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Campo, CampoBusca, Entrada, Selecao } from '@/components/ui/Campos';
import { Janela, useConfirmar } from '@/components/ui/Janela';
import { FiltroSelecao, MenuAcoes } from '@/components/ui/Menus';
import { Selo } from '@/components/ui/Selo';
import { LinhaVazia, Paginacao, Tabela, Td, Th, Tr, usePaginacao } from '@/components/ui/Tabela';
import { contemTexto, formatarUltimoAcesso } from '@/lib/formatacao';
import { SITUACOES_CADASTRO } from '@/lib/opcoes';
import { tomCadastro, tomPerfil } from '@/lib/regras';
import { useUsuarioAtual } from '@/store/acesso';
import { useDados } from '@/store/dados';
import type { SituacaoCadastro, Usuario } from '@/types';

export function AbasAdministracao({ usuarios }: { usuarios: number }) {
  return (
    <Abas
      itens={[
        { id: 'usuarios', rotulo: 'Usuários', contagem: usuarios, para: '/administracao' },
        { id: 'perfis', rotulo: 'Perfis e permissões', para: '/administracao/perfis' },
      ]}
    />
  );
}

export default function Usuarios() {
  const confirmar = useConfirmar();
  const usuarios = useDados((s) => s.usuarios);
  const perfis = useDados((s) => s.perfis);
  const alternarSituacao = useDados((s) => s.alternarSituacaoUsuario);
  const excluir = useDados((s) => s.excluirUsuario);
  const atual = useUsuarioAtual();

  const [busca, setBusca] = useState('');
  const [perfil, setPerfil] = useState('');
  const [situacao, setSituacao] = useState('');
  const [janela, setJanela] = useState<{ aberta: boolean; usuario?: Usuario }>({ aberta: false });

  const filtrados = useMemo(
    () =>
      usuarios
        .filter((u) => !busca || contemTexto(u.nome, busca) || contemTexto(u.email, busca))
        .filter((u) => !perfil || u.perfilId === perfil)
        .filter((u) => !situacao || u.situacao === situacao),
    [usuarios, busca, perfil, situacao],
  );
  const paginacao = usePaginacao(filtrados);
  const nomePerfil = (id: string) => perfis.find((p) => p.id === id)?.nome ?? '—';

  const pedirExclusao = async (u: Usuario) => {
    const ok = await confirmar({
      titulo: 'Excluir usuário?',
      mensagem: `${u.nome} não poderá mais entrar no sistema. Os registros feitos por ele(a) serão mantidos.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    excluir(u.id);
    toast.success('Usuário excluído.');
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Contas e permissões"
        subtitulo="Gerencie os usuários do sistema e seus perfis de acesso."
        acoes={
          <Botao icone={Plus} onClick={() => setJanela({ aberta: true })}>
            Novo usuário
          </Botao>
        }
      />
      <AbasAdministracao usuarios={usuarios.length} />

      <div className="mb-5 flex flex-wrap gap-3">
        <CampoBusca
          className="w-full max-w-[380px]"
          placeholder="Pesquisar por nome ou e-mail..."
          aria-label="Pesquisar usuários"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <FiltroSelecao rotulo="Perfil" valor={perfil} opcoes={perfis.map((p) => ({ valor: p.id, rotulo: p.nome }))} aoMudar={setPerfil} />
        <FiltroSelecao rotulo="Situação" valor={situacao} opcoes={[...SITUACOES_CADASTRO]} aoMudar={setSituacao} />
      </div>

      <Tabela rodape={<Paginacao {...paginacao} rotulo="usuários" />}>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>E-mail</Th>
            <Th>Perfil</Th>
            <Th>Último acesso</Th>
            <Th>Situação</Th>
            <Th className="w-20">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {paginacao.paginados.length === 0 && <LinhaVazia colunas={6} texto="Nenhum usuário encontrado." />}
          {paginacao.paginados.map((u) => {
            const ehVoce = u.id === atual?.id;
            return (
              <Tr key={u.id}>
                <Td className="whitespace-nowrap">
                  {u.nome}
                  {ehVoce && <span className="ml-2 text-[12.5px] text-muted">(você)</span>}
                </Td>
                <Td>{u.email}</Td>
                <Td>
                  <Selo tom={tomPerfil(nomePerfil(u.perfilId))}>{nomePerfil(u.perfilId)}</Selo>
                </Td>
                <Td className="whitespace-nowrap">{formatarUltimoAcesso(u.ultimoAcesso)}</Td>
                <Td>
                  <Selo tom={tomCadastro(u.situacao)}>{u.situacao}</Selo>
                </Td>
                <Td>
                  <MenuAcoes
                    rotulo={`Ações de ${u.nome}`}
                    acoes={[
                      { rotulo: 'Editar', icone: Pencil, aoClicar: () => setJanela({ aberta: true, usuario: u }) },
                      {
                        rotulo: u.situacao === 'Ativo' ? 'Desativar' : 'Reativar',
                        icone: Power,
                        oculto: ehVoce,
                        aoClicar: () => {
                          alternarSituacao(u.id);
                          toast.success(u.situacao === 'Ativo' ? 'Usuário desativado.' : 'Usuário reativado.');
                        },
                      },
                      { rotulo: 'Excluir', icone: Trash2, perigo: true, oculto: ehVoce, aoClicar: () => pedirExclusao(u) },
                    ]}
                  />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Tabela>

      <JanelaUsuario
        key={janela.usuario?.id ?? 'novo'}
        aberta={janela.aberta}
        aoMudar={(aberta) => setJanela((j) => ({ ...j, aberta }))}
        usuario={janela.usuario}
        ehVoce={janela.usuario?.id === atual?.id}
      />
    </>
  );
}

function JanelaUsuario({
  aberta,
  aoMudar,
  usuario,
  ehVoce,
}: {
  aberta: boolean;
  aoMudar: (v: boolean) => void;
  usuario?: Usuario;
  ehVoce: boolean;
}) {
  const perfis = useDados((s) => s.perfis);
  const salvar = useDados((s) => s.salvarUsuario);
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [perfilId, setPerfilId] = useState(usuario?.perfilId ?? '');
  const [situacao, setSituacao] = useState<SituacaoCadastro>(usuario?.situacao ?? 'Ativo');
  const [erros, setErros] = useState<Record<string, string>>({});

  const enviar = () => {
    const novos: Record<string, string> = {};
    if (nome.trim().length < 3) novos.nome = 'Informe o nome (mínimo de 3 letras).';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) novos.email = 'Informe um e-mail válido.';
    if (!perfilId) novos.perfil = 'Selecione o perfil.';
    setErros(novos);
    if (Object.keys(novos).length) return;
    const r = salvar({ nome: nome.trim(), email, perfilId, situacao }, usuario?.id);
    if (!r.ok) return setErros({ email: r.erro });
    toast.success(usuario ? 'Usuário atualizado.' : 'Usuário criado. Ele já pode entrar com a senha de demonstração.');
    aoMudar(false);
    if (!usuario) {
      setNome('');
      setEmail('');
      setPerfilId('');
      setSituacao('Ativo');
    }
  };

  return (
    <Janela
      aberta={aberta}
      aoMudar={(v) => {
        aoMudar(v);
        setErros({});
      }}
      titulo={usuario ? 'Editar usuário' : 'Novo usuário'}
      descricao="O perfil define o que a pessoa pode ver e fazer no sistema."
      rodape={
        <>
          <Botao variante="secundario" onClick={() => aoMudar(false)}>
            Cancelar
          </Botao>
          <Botao onClick={enviar}>Salvar</Botao>
        </>
      }
    >
      <div className="space-y-4">
        <Campo rotulo="Nome" obrigatorio htmlFor="usu-nome" erro={erros.nome}>
          <Entrada id="usu-nome" value={nome} aria-invalid={!!erros.nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
        </Campo>
        <Campo rotulo="E-mail" obrigatorio htmlFor="usu-email" erro={erros.email}>
          <Entrada
            id="usu-email"
            type="email"
            value={email}
            aria-invalid={!!erros.email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@sesfa.org"
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Perfil" obrigatorio htmlFor="usu-perfil" erro={erros.perfil} dica={ehVoce ? 'Você não pode mudar o próprio perfil.' : undefined}>
            <Selecao
              id="usu-perfil"
              placeholder="Selecione..."
              value={perfilId}
              disabled={ehVoce}
              aria-invalid={!!erros.perfil}
              onChange={(e) => setPerfilId(e.target.value)}
            >
              {perfis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Situação" htmlFor="usu-situacao">
            <Selecao id="usu-situacao" value={situacao} disabled={ehVoce} onChange={(e) => setSituacao(e.target.value as SituacaoCadastro)}>
              {SITUACOES_CADASTRO.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Selecao>
          </Campo>
        </div>
      </div>
    </Janela>
  );
}
