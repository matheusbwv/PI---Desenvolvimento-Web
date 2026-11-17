import { create } from 'zustand';

// Guarda o token de acesso devolvido pela API e qual usuário está logado.
// "Lembrar de mim" marcado -> localStorage (continua logado ao fechar o navegador).
// Desmarcado -> sessionStorage (sai ao fechar a aba).
const CHAVE = 'sesfa-sessao';

interface Sessao {
  token: string;
  usuarioId: string;
}

function lerSessao(): Sessao | null {
  try {
    const texto = localStorage.getItem(CHAVE) ?? sessionStorage.getItem(CHAVE);
    const sessao = texto ? (JSON.parse(texto) as Partial<Sessao>) : null;
    return sessao?.token && sessao.usuarioId ? { token: sessao.token, usuarioId: sessao.usuarioId } : null;
  } catch {
    return null;
  }
}

interface EstadoSessao {
  token: string | null;
  usuarioId: string | null;
  entrar: (token: string, usuarioId: string, lembrar: boolean) => void;
  sair: () => void;
}

const inicial = lerSessao();

export const useSessao = create<EstadoSessao>((set) => ({
  token: inicial?.token ?? null,
  usuarioId: inicial?.usuarioId ?? null,
  entrar: (token, usuarioId, lembrar) => {
    try {
      const guardar = lembrar ? localStorage : sessionStorage;
      const limpar = lembrar ? sessionStorage : localStorage;
      guardar.setItem(CHAVE, JSON.stringify({ token, usuarioId }));
      limpar.removeItem(CHAVE);
    } catch {
      // Navegador sem armazenamento: a sessão vale só enquanto a página estiver aberta.
    }
    set({ token, usuarioId });
  },
  sair: () => {
    try {
      localStorage.removeItem(CHAVE);
      sessionStorage.removeItem(CHAVE);
    } catch {
      // ignora
    }
    set({ token: null, usuarioId: null });
  },
}));
