import { create } from 'zustand';

// Guarda qual usuário está logado.
// "Lembrar de mim" marcado -> localStorage (continua logado ao fechar o navegador).
// Desmarcado -> sessionStorage (sai ao fechar a aba).
const CHAVE = 'sesfa-sessao';

function lerSessao(): string | null {
  try {
    return localStorage.getItem(CHAVE) ?? sessionStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

interface EstadoSessao {
  usuarioId: string | null;
  entrar: (usuarioId: string, lembrar: boolean) => void;
  sair: () => void;
}

export const useSessao = create<EstadoSessao>((set) => ({
  usuarioId: lerSessao(),
  entrar: (usuarioId, lembrar) => {
    try {
      const guardar = lembrar ? localStorage : sessionStorage;
      const limpar = lembrar ? sessionStorage : localStorage;
      guardar.setItem(CHAVE, usuarioId);
      limpar.removeItem(CHAVE);
    } catch {
      // Navegador sem armazenamento: a sessão vale só enquanto a página estiver aberta.
    }
    set({ usuarioId });
  },
  sair: () => {
    try {
      localStorage.removeItem(CHAVE);
      sessionStorage.removeItem(CHAVE);
    } catch {
      // ignora
    }
    set({ usuarioId: null });
  },
}));
