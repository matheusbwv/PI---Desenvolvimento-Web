import { chamarApi, mensagemDoErro } from '@/lib/api';
import { useDados } from '@/store/dados';
import { useSessao } from '@/store/sessao';
import type { Acao, Modulo, Perfil, Usuario } from '@/types';

/** Usuário logado (ou undefined se ninguém entrou ou os dados ainda não chegaram). */
export function useUsuarioAtual(): Usuario | undefined {
  const id = useSessao((s) => s.usuarioId);
  return useDados((s) => s.usuarios.find((u) => u.id === id));
}

export function usePerfilAtual(): Perfil | undefined {
  const usuario = useUsuarioAtual();
  return useDados((s) => s.perfis.find((p) => p.id === usuario?.perfilId));
}

/**
 * Diz se o perfil do usuário logado pode fazer uma ação em um módulo.
 * Serve para esconder botões; quem garante a permissão de verdade é o servidor.
 */
export function usePode(modulo: Modulo, acao: Acao = 'visualizar'): boolean {
  const perfil = usePerfilAtual();
  return perfil?.permissoes[modulo]?.[acao] ?? false;
}

/** Login: o servidor confere a senha e devolve um token de acesso. */
export async function autenticar(login: string, senha: string, lembrar: boolean): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const { token, usuario } = await chamarApi<{ token: string; usuario: Usuario }>('/auth/entrar', 'POST', { login, senha, lembrar });
    useSessao.getState().entrar(token, usuario.id, lembrar);
    await useDados.getState().carregar();
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDoErro(erro) };
  }
}

/** Primeiro acesso: com o banco vazio, cadastra o administrador e já entra com ele. */
export async function criarPrimeiroAdministrador(dados: { nome: string; email: string; senha: string }): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const { token, usuario } = await chamarApi<{ token: string; usuario: Usuario }>('/auth/primeiro-acesso', 'POST', dados);
    useSessao.getState().entrar(token, usuario.id, false);
    await useDados.getState().carregar();
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: mensagemDoErro(erro) };
  }
}

/** Sai do sistema e limpa os dados da memória. */
export function sair() {
  useSessao.getState().sair();
  useDados.getState().limpar();
}
