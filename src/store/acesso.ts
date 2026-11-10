import { SENHA_DEMO } from '@/data/exemplo';
import { useDados } from '@/store/dados';
import { useSessao } from '@/store/sessao';
import type { Acao, Modulo, Perfil, Usuario } from '@/types';

/** Usuário logado (ou undefined se ninguém entrou). */
export function useUsuarioAtual(): Usuario | undefined {
  const id = useSessao((s) => s.usuarioId);
  return useDados((s) => s.usuarios.find((u) => u.id === id));
}

export function usePerfilAtual(): Perfil | undefined {
  const usuario = useUsuarioAtual();
  return useDados((s) => s.perfis.find((p) => p.id === usuario?.perfilId));
}

/** Diz se o perfil do usuário logado pode fazer uma ação em um módulo. */
export function usePode(modulo: Modulo, acao: Acao = 'visualizar'): boolean {
  const perfil = usePerfilAtual();
  return perfil?.permissoes[modulo]?.[acao] ?? false;
}

/**
 * Login simulado: aceita o e-mail completo ou só o usuário (parte antes do @),
 * com a senha de demonstração.
 */
export function autenticar(login: string, senha: string, lembrar: boolean): { ok: true } | { ok: false; erro: string } {
  const texto = login.trim().toLowerCase();
  const usuario = useDados
    .getState()
    .usuarios.find((u) => u.email.toLowerCase() === texto || u.email.toLowerCase().split('@')[0] === texto);
  if (!usuario || senha !== SENHA_DEMO) return { ok: false, erro: 'Usuário ou senha inválidos.' };
  if (usuario.situacao === 'Inativo') return { ok: false, erro: 'Este usuário está inativo. Procure o administrador.' };
  useDados.getState().registrarAcesso(usuario.id);
  useSessao.getState().entrar(usuario.id, lembrar);
  return { ok: true };
}
