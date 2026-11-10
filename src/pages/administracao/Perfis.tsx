import { clsx } from 'clsx';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useBlocker } from 'react-router';
import { toast } from 'sonner';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Cartao } from '@/components/ui/Cartao';
import { Janela } from '@/components/ui/Janela';
import { Tabela, Td, Th, Tr } from '@/components/ui/Tabela';
import { ACOES, MODULOS } from '@/lib/opcoes';
import { useDados } from '@/store/dados';
import type { Acao, Modulo, Perfil } from '@/types';
import { AbasAdministracao } from './Usuarios';

export default function Perfis() {
  const perfisSalvos = useDados((s) => s.perfis);
  const usuarios = useDados((s) => s.usuarios);
  const salvarPerfis = useDados((s) => s.salvarPerfis);
  const [rascunho, setRascunho] = useState<Perfil[]>(perfisSalvos);
  const [selecionado, setSelecionado] = useState('p-coord');

  const alterado = JSON.stringify(rascunho) !== JSON.stringify(perfisSalvos);
  const bloqueio = useBlocker(alterado);
  const perfil = rascunho.find((p) => p.id === selecionado) ?? rascunho[0];
  const travado = perfil.id === 'p-admin';

  const marcar = (modulo: Modulo, acao: Acao, valor: boolean) =>
    setRascunho((lista) =>
      lista.map((p) => {
        if (p.id !== perfil.id) return p;
        const linha = { ...p.permissoes[modulo], [acao]: valor };
        // Sem "Visualizar" não faz sentido criar/editar/excluir; e qualquer ação exige visualizar.
        if (acao === 'visualizar' && !valor) Object.assign(linha, { criar: false, editar: false, excluir: false });
        if (acao !== 'visualizar' && valor) linha.visualizar = true;
        return { ...p, permissoes: { ...p.permissoes, [modulo]: linha } };
      }),
    );

  const salvar = () => {
    salvarPerfis(rascunho);
    toast.success('Permissões salvas.');
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Contas e permissões"
        subtitulo="Defina o que cada perfil pode fazer em cada módulo."
        acoes={
          <>
            <Botao variante="secundario" disabled={!alterado} onClick={() => setRascunho(perfisSalvos)}>
              Cancelar
            </Botao>
            <Botao disabled={!alterado} onClick={salvar}>
              Salvar alterações
            </Botao>
          </>
        }
      />
      <AbasAdministracao usuarios={usuarios.length} />

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Cartao className="h-fit p-2.5">
          <ul className="space-y-1" role="listbox" aria-label="Perfis">
            {rascunho.map((p) => {
              const ativo = p.id === perfil.id;
              const quantos = usuarios.filter((u) => u.perfilId === p.id).length;
              return (
                <li key={p.id} role="option" aria-selected={ativo}>
                  <button
                    type="button"
                    onClick={() => setSelecionado(p.id)}
                    className={clsx(
                      'w-full cursor-pointer rounded-lg px-3.5 py-3 text-left transition-colors',
                      ativo ? 'bg-primary-soft' : 'hover:bg-page',
                    )}
                  >
                    <span className={clsx('block text-[14.5px]', ativo ? 'font-semibold text-brand' : 'text-ink')}>{p.nome}</span>
                    <span className="block text-[13px] text-muted">
                      {p.descricao} · {quantos} {quantos === 1 ? 'usuário' : 'usuários'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Cartao>

        <div>
          {travado && (
            <p className="mb-3 flex items-center gap-2 text-[13.5px] text-muted">
              <Lock className="size-4" aria-hidden />
              O perfil Administrador sempre tem acesso total e não pode ser alterado.
            </p>
          )}
          <Tabela>
            <thead>
              <tr>
                <Th>Módulo</Th>
                {ACOES.map((a) => (
                  <Th key={a.id} className="w-28 text-center">
                    {a.nome}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULOS.map((m) => (
                <Tr key={m.id}>
                  <Td>{m.nome}</Td>
                  {ACOES.map((a) => (
                    <Td key={a.id} className="text-center">
                      <input
                        type="checkbox"
                        checked={perfil.permissoes[m.id][a.id]}
                        disabled={travado}
                        onChange={(e) => marcar(m.id, a.id, e.target.checked)}
                        aria-label={`${perfil.nome}: ${a.nome} em ${m.nome}`}
                        className="size-[18px] cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Tabela>
        </div>
      </div>

      <Janela
        aberta={bloqueio.state === 'blocked'}
        aoMudar={(v) => !v && bloqueio.reset?.()}
        titulo="Sair sem salvar?"
        descricao="Você alterou permissões e ainda não salvou. Se sair agora, as mudanças serão perdidas."
        largura="sm"
        rodape={
          <>
            <Botao variante="secundario" onClick={() => bloqueio.reset?.()}>
              Continuar editando
            </Botao>
            <Botao className="bg-danger hover:bg-danger/90" onClick={() => bloqueio.proceed?.()}>
              Sair sem salvar
            </Botao>
          </>
        }
      />
    </>
  );
}
