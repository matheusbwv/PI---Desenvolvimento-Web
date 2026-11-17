// Leitura do banco já no formato que o front-end usa (src/types.ts).
import { todos, um } from './banco.ts';
import { bool } from './util.ts';
import type {
  Acao,
  Atividade,
  Comunicado,
  Dados,
  Demanda,
  Documento,
  EventoHistorico,
  Grupo,
  Inscricao,
  Membro,
  Modulo,
  Notificacao,
  Perfil,
  Permissoes,
  RelatorioGerado,
  Tarefa,
  TipoArquivo,
  Usuario,
  VinculoDocumento,
} from '../src/types.ts';

export const MODULOS: Modulo[] = ['membros', 'grupos', 'atividades', 'inscricoes', 'comunicados', 'demandas', 'relatorios', 'administracao'];
export const ACOES: Acao[] = ['visualizar', 'criar', 'editar', 'excluir'];

/** Agrupa linhas por uma chave (ex.: tarefas por demanda). */
function agrupar<T>(linhas: T[], chave: keyof T): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const linha of linhas) {
    const k = String(linha[chave]);
    mapa.set(k, [...(mapa.get(k) ?? []), linha]);
  }
  return mapa;
}

export const listarMembros = () => todos<Membro>('SELECT * FROM membros ORDER BY rowid');

export function listarGrupos(): Grupo[] {
  const vinculos = agrupar(todos<{ grupoId: string; membroId: string }>('SELECT * FROM grupoMembros ORDER BY rowid'), 'grupoId');
  return todos<Omit<Grupo, 'membroIds'>>('SELECT * FROM grupos ORDER BY rowid').map((g) => ({
    ...g,
    membroIds: (vinculos.get(g.id) ?? []).map((v) => v.membroId),
  }));
}

export const listarAtividades = () => todos<Atividade>('SELECT * FROM atividades ORDER BY rowid');

export function listarInscricoes(): Inscricao[] {
  return todos<Inscricao & { presente: number | null }>('SELECT * FROM inscricoes ORDER BY rowid').map((i) => ({
    ...i,
    presente: i.presente === null ? null : bool(i.presente),
  }));
}

export function listarComunicados(): Comunicado[] {
  return todos<Comunicado>('SELECT * FROM comunicados ORDER BY rowid DESC').map((c) => ({ ...c, notificar: bool(c.notificar) }));
}

/** Notificações com "lida" calculado para o usuário que pediu. */
export function listarNotificacoes(usuarioId: string): Notificacao[] {
  return todos<Notificacao>(
    `SELECT n.*, EXISTS (SELECT 1 FROM notificacoesLidas l WHERE l.notificacaoId = n.id AND l.usuarioId = ?) AS lida
       FROM notificacoes n
      ORDER BY n.criadaEm DESC, n.rowid DESC`,
    usuarioId,
  ).map((n) => ({ ...n, lida: bool(n.lida) }));
}

export function listarDemandas(id?: string): Demanda[] {
  const filtro = id ? ' WHERE demandaId = ?' : '';
  const params = id ? [id] : [];
  const tarefas = agrupar(todos<Tarefa & { demandaId: string }>(`SELECT * FROM tarefas${filtro} ORDER BY rowid`, ...params), 'demandaId');
  const historico = agrupar(
    todos<EventoHistorico & { demandaId: string }>(`SELECT * FROM historicoDemandas${filtro} ORDER BY rowid DESC`, ...params),
    'demandaId',
  );
  const demandas = id
    ? todos<Demanda>('SELECT * FROM demandas WHERE id = ?', id)
    : todos<Demanda>('SELECT * FROM demandas ORDER BY rowid DESC');
  return demandas.map((d) => ({
    ...d,
    tarefas: (tarefas.get(d.id) ?? []).map(({ demandaId: _, ...t }) => t),
    historico: (historico.get(d.id) ?? []).map(({ demandaId: _, ...h }) => h),
  }));
}

export const buscarDemanda = (id: string) => listarDemandas(id)[0];

/**
 * Usuários sem o hash da senha. Quem não é da administração só vê o próprio e-mail
 * e o próprio último acesso; dos outros, só nome e perfil.
 */
export function listarUsuarios(completo: boolean, proprioId = ''): Usuario[] {
  return todos<Usuario>('SELECT id, nome, email, perfilId, situacao, ultimoAcesso FROM usuarios ORDER BY rowid').map((u) =>
    completo || u.id === proprioId ? u : { ...u, email: '', ultimoAcesso: '' },
  );
}

export function permissoesDoPerfil(perfilId: string): Permissoes {
  const linhas = todos<{ modulo: Modulo } & Record<Acao, number>>('SELECT * FROM permissoes WHERE perfilId = ?', perfilId);
  const permissoes = {} as Permissoes;
  for (const modulo of MODULOS) {
    const linha = linhas.find((l) => l.modulo === modulo);
    permissoes[modulo] = Object.fromEntries(ACOES.map((a) => [a, bool(linha?.[a])])) as Record<Acao, boolean>;
  }
  return permissoes;
}

export function listarPerfis(): Perfil[] {
  return todos<Omit<Perfil, 'permissoes'>>('SELECT * FROM perfis ORDER BY rowid').map((p) => ({
    ...p,
    permissoes: permissoesDoPerfil(p.id),
  }));
}

type LinhaDocumento = Omit<Documento, 'vinculo' | 'temArquivo'> & {
  vinculoTipo: VinculoDocumento['tipo'];
  vinculoId: string;
  vinculoRotulo: string;
  temArquivo: number;
};

const paraDocumento = ({ vinculoTipo, vinculoId, vinculoRotulo, temArquivo, ...d }: LinhaDocumento): Documento => ({
  ...d,
  tipo: d.tipo as TipoArquivo,
  vinculo: { tipo: vinculoTipo, id: vinculoId, rotulo: vinculoRotulo },
  temArquivo: bool(temArquivo),
});

export const listarDocumentos = () => todos<LinhaDocumento>('SELECT * FROM documentos ORDER BY rowid DESC').map(paraDocumento);

export function buscarDocumento(id: string): Documento | undefined {
  const linha = um<LinhaDocumento>('SELECT * FROM documentos WHERE id = ?', id);
  return linha && paraDocumento(linha);
}

export const listarRelatorios = () => todos<RelatorioGerado>('SELECT * FROM relatorios ORDER BY rowid DESC');

/** Tudo o que a tela precisa, respeitando o que o perfil pode ver. */
export function carregarDados(usuarioId: string, permissoes: Permissoes): Dados {
  const ve = (m: Modulo) => permissoes[m].visualizar;
  return {
    membros: listarMembros(),
    grupos: listarGrupos(),
    atividades: listarAtividades(),
    inscricoes: listarInscricoes(),
    comunicados: listarComunicados(),
    notificacoes: listarNotificacoes(usuarioId),
    demandas: listarDemandas(),
    usuarios: listarUsuarios(ve('administracao'), usuarioId),
    perfis: listarPerfis(),
    documentos: ve('relatorios') ? listarDocumentos() : [],
    relatorios: ve('relatorios') ? listarRelatorios() : [],
  };
}
