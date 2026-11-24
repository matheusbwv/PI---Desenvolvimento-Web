import { toast } from 'sonner';
import { create } from 'zustand';
import { chamarApi, mensagemDoErro } from '@/lib/api';
import type {
  Atividade,
  Comunicado,
  Dados,
  Demanda,
  Documento,
  Grupo,
  Inscricao,
  Membro,
  Perfil,
  RelatorioGerado,
  SituacaoTarefa,
  Tarefa,
  Usuario,
} from '@/types';

// Os dados ficam no servidor (API + banco SQLite). Esta store guarda uma cópia para as telas:
// cada ação chama a API e, se der certo, busca os dados de novo.

export type DadosMembro = Omit<Membro, 'id' | 'codigo' | 'criadoEm'>;
export type DadosGrupo = Omit<Grupo, 'id' | 'codigo' | 'membroIds'>;
export type DadosAtividade = Omit<Atividade, 'id'>;
export type DadosComunicado = Omit<Comunicado, 'id' | 'criadoEm'>;
export type DadosDemanda = Omit<Demanda, 'id' | 'codigo' | 'tarefas' | 'historico' | 'criadaEm' | 'concluidaEm'>;
export type DadosTarefa = Omit<Tarefa, 'id'>;
export type DadosUsuario = Omit<Usuario, 'id' | 'ultimoAcesso'> & { senha: string };
export type DadosDocumento = Pick<Documento, 'nome' | 'tipo' | 'vinculo'> & { arquivo: File };

export type Resultado = { ok: true; mensagem?: string } | { ok: false; erro: string };

interface Acoes {
  carregar: () => Promise<void>;
  limpar: () => void;

  salvarMembro: (dados: DadosMembro, id?: string) => Promise<Membro | undefined>;
  alternarSituacaoMembro: (id: string) => Promise<boolean>;
  excluirMembro: (id: string) => Promise<boolean>;

  salvarGrupo: (dados: DadosGrupo, id?: string) => Promise<Grupo | undefined>;
  alternarSituacaoGrupo: (id: string) => Promise<boolean>;
  excluirGrupo: (id: string) => Promise<boolean>;
  adicionarMembrosAoGrupo: (grupoId: string, membroIds: string[]) => Promise<boolean>;
  removerMembroDoGrupo: (grupoId: string, membroId: string) => Promise<boolean>;

  salvarAtividade: (dados: DadosAtividade, id?: string) => Promise<Atividade | undefined>;
  excluirAtividade: (id: string) => Promise<boolean>;

  inscrever: (atividadeId: string, membroId: string) => Promise<Resultado>;
  cancelarInscricao: (id: string) => Promise<boolean>;
  promoverInscricao: (id: string) => Promise<Resultado>;
  definirPresenca: (id: string, presente: boolean | null) => Promise<boolean>;
  registrarPresenca: (atividadeId: string) => Promise<boolean>;

  salvarComunicado: (dados: DadosComunicado, id?: string) => Promise<Comunicado | undefined>;
  publicarComunicado: (id: string) => Promise<boolean>;
  excluirComunicado: (id: string) => Promise<boolean>;

  marcarComoLida: (id: string) => Promise<boolean>;
  marcarTodasComoLidas: () => Promise<boolean>;

  salvarDemanda: (dados: DadosDemanda, id?: string) => Promise<Demanda | undefined>;
  excluirDemanda: (id: string) => Promise<boolean>;
  salvarTarefa: (demandaId: string, dados: DadosTarefa, tarefaId?: string) => Promise<boolean>;
  alternarTarefa: (demandaId: string, tarefaId: string) => Promise<boolean>;
  definirSituacaoTarefa: (demandaId: string, tarefaId: string, situacao: SituacaoTarefa) => Promise<boolean>;
  excluirTarefa: (demandaId: string, tarefaId: string) => Promise<boolean>;

  salvarUsuario: (dados: DadosUsuario, id?: string) => Promise<Resultado>;
  alternarSituacaoUsuario: (id: string) => Promise<boolean>;
  excluirUsuario: (id: string) => Promise<boolean>;
  salvarPerfis: (perfis: Perfil[]) => Promise<boolean>;

  adicionarDocumento: (dados: DadosDocumento) => Promise<Documento | undefined>;
  excluirDocumento: (id: string) => Promise<boolean>;

  registrarRelatorio: (dados: Omit<RelatorioGerado, 'id' | 'geradoPor' | 'geradoEm'>) => Promise<boolean>;

}

export interface EstadoDados extends Dados, Acoes {
  /** true depois que os dados chegaram do servidor pela primeira vez. */
  carregado: boolean;
  /** Mensagem quando não foi possível buscar os dados. */
  erroCarga: string | null;
}

const vazio: Dados = {
  membros: [],
  grupos: [],
  atividades: [],
  inscricoes: [],
  comunicados: [],
  notificacoes: [],
  demandas: [],
  usuarios: [],
  perfis: [],
  documentos: [],
  relatorios: [],
};

// A versão sem servidor guardava tudo no navegador; essa cópia antiga não é mais usada.
try {
  localStorage.removeItem('elo-dados');
  localStorage.removeItem('sesfa-dados');
} catch {
  // navegador sem armazenamento
}

/** Lê um arquivo e devolve o conteúdo em base64 (é assim que ele vai para a API). */
function paraBase64(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result).split(',')[1] ?? '');
    leitor.onerror = () => rejeitar(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}

export const useDados = create<EstadoDados>()((set, get) => {
  /** Chama a API; se der certo, atualiza os dados. Se der errado, mostra o erro e devolve undefined. */
  async function executar<T>(chamada: () => Promise<T>): Promise<T | undefined> {
    try {
      const resposta = await chamada();
      await get().carregar();
      return resposta;
    } catch (erro) {
      toast.error(mensagemDoErro(erro));
      return undefined;
    }
  }

  /** Igual a executar, mas para ações que dão true/false. */
  const fazer = async (chamada: () => Promise<unknown>) => (await executar(async () => (await chamada(), true))) ?? false;

  /** Para telas que mostram a mensagem do servidor (sucesso ou erro) do jeito delas. */
  async function comResultado(chamada: () => Promise<{ mensagem?: string } | unknown>): Promise<Resultado> {
    try {
      const resposta = (await chamada()) as { mensagem?: string } | undefined;
      await get().carregar();
      return { ok: true, mensagem: resposta?.mensagem };
    } catch (erro) {
      return { ok: false, erro: mensagemDoErro(erro) };
    }
  }

  const salvar = <T>(recurso: string, dados: unknown, id?: string) =>
    executar(() => chamarApi<T>(id ? `${recurso}/${id}` : recurso, id ? 'PUT' : 'POST', dados));

  return {
    ...vazio,
    carregado: false,
    erroCarga: null,

    carregar: async () => {
      try {
        const dados = await chamarApi<Dados>('/dados');
        set({ ...dados, carregado: true, erroCarga: null });
      } catch (erro) {
        set({ erroCarga: mensagemDoErro(erro) });
        throw erro;
      }
    },
    limpar: () => set({ ...vazio, carregado: false, erroCarga: null }),

    // ------------------------------------------------------------ Membros
    salvarMembro: (dados, id) => salvar<Membro>('/membros', dados, id),
    alternarSituacaoMembro: (id) => fazer(() => chamarApi(`/membros/${id}/situacao`, 'PATCH')),
    excluirMembro: (id) => fazer(() => chamarApi(`/membros/${id}`, 'DELETE')),

    // ------------------------------------------------------------- Grupos
    salvarGrupo: (dados, id) => salvar<Grupo>('/grupos', dados, id),
    alternarSituacaoGrupo: (id) => fazer(() => chamarApi(`/grupos/${id}/situacao`, 'PATCH')),
    excluirGrupo: (id) => fazer(() => chamarApi(`/grupos/${id}`, 'DELETE')),
    adicionarMembrosAoGrupo: (grupoId, membroIds) => fazer(() => chamarApi(`/grupos/${grupoId}/membros`, 'POST', { membroIds })),
    removerMembroDoGrupo: (grupoId, membroId) => fazer(() => chamarApi(`/grupos/${grupoId}/membros/${membroId}`, 'DELETE')),

    // --------------------------------------------------------- Atividades
    salvarAtividade: (dados, id) => salvar<Atividade>('/atividades', dados, id),
    excluirAtividade: (id) => fazer(() => chamarApi(`/atividades/${id}`, 'DELETE')),

    // --------------------------------------------------------- Inscrições
    inscrever: (atividadeId, membroId) => comResultado(() => chamarApi<{ inscricao: Inscricao; mensagem: string }>('/inscricoes', 'POST', { atividadeId, membroId })),
    cancelarInscricao: (id) => fazer(() => chamarApi(`/inscricoes/${id}/cancelar`, 'POST')),
    promoverInscricao: (id) => comResultado(() => chamarApi(`/inscricoes/${id}/promover`, 'POST')),
    definirPresenca: (id, presente) => fazer(() => chamarApi(`/inscricoes/${id}/presenca`, 'PATCH', { presente })),
    registrarPresenca: (atividadeId) => fazer(() => chamarApi(`/atividades/${atividadeId}/presenca`, 'POST')),

    // -------------------------------------------------------- Comunicados
    salvarComunicado: (dados, id) => salvar<Comunicado>('/comunicados', dados, id),
    publicarComunicado: (id) => fazer(() => chamarApi(`/comunicados/${id}/publicar`, 'POST')),
    excluirComunicado: (id) => fazer(() => chamarApi(`/comunicados/${id}`, 'DELETE')),

    // ------------------------------------------------------- Notificações
    marcarComoLida: (id) => fazer(() => chamarApi(`/notificacoes/${id}/lida`, 'POST')),
    marcarTodasComoLidas: () => fazer(() => chamarApi('/notificacoes/lidas', 'POST')),

    // ----------------------------------------------------------- Demandas
    salvarDemanda: (dados, id) => salvar<Demanda>('/demandas', dados, id),
    excluirDemanda: (id) => fazer(() => chamarApi(`/demandas/${id}`, 'DELETE')),
    salvarTarefa: (demandaId, dados, tarefaId) =>
      fazer(() =>
        chamarApi(tarefaId ? `/demandas/${demandaId}/tarefas/${tarefaId}` : `/demandas/${demandaId}/tarefas`, tarefaId ? 'PUT' : 'POST', dados),
      ),
    alternarTarefa: (demandaId, tarefaId) => fazer(() => chamarApi(`/demandas/${demandaId}/tarefas/${tarefaId}/situacao`, 'PATCH', {})),
    definirSituacaoTarefa: (demandaId, tarefaId, situacao) =>
      fazer(() => chamarApi(`/demandas/${demandaId}/tarefas/${tarefaId}/situacao`, 'PATCH', { situacao })),
    excluirTarefa: (demandaId, tarefaId) => fazer(() => chamarApi(`/demandas/${demandaId}/tarefas/${tarefaId}`, 'DELETE')),

    // ----------------------------------------------------------- Usuários
    salvarUsuario: (dados, id) => comResultado(() => chamarApi(id ? `/usuarios/${id}` : '/usuarios', id ? 'PUT' : 'POST', dados)),
    alternarSituacaoUsuario: (id) => fazer(() => chamarApi(`/usuarios/${id}/situacao`, 'PATCH')),
    excluirUsuario: (id) => fazer(() => chamarApi(`/usuarios/${id}`, 'DELETE')),
    salvarPerfis: (perfis) => fazer(() => chamarApi('/perfis', 'PUT', perfis)),

    // --------------------------------------------------------- Documentos
    adicionarDocumento: ({ arquivo, ...dados }) =>
      executar(async () => chamarApi<Documento>('/documentos', 'POST', { ...dados, conteudo: await paraBase64(arquivo) })),
    excluirDocumento: (id) => fazer(() => chamarApi(`/documentos/${id}`, 'DELETE')),

    // --------------------------------------------------------- Relatórios
    registrarRelatorio: (dados) => fazer(() => chamarApi('/relatorios', 'POST', dados)),

  };
});
