// Modelos de dados do SESFA.
// Datas sem hora usam o formato ISO "aaaa-mm-dd"; datas com hora usam ISO completo.

export type SituacaoCadastro = 'Ativo' | 'Inativo';

export interface Membro {
  id: string;
  codigo: string;
  nome: string;
  nascimento: string;
  identificador: string;
  telefone: string;
  email: string;
  municipio: string;
  bairro: string;
  situacao: SituacaoCadastro;
  criadoEm: string;
}

export interface Grupo {
  id: string;
  codigo: string;
  nome: string;
  responsavelId: string;
  objetivo: string;
  municipio: string;
  bairro: string;
  criadoEm: string;
  situacao: SituacaoCadastro;
  membroIds: string[];
}

export type TipoAtividade = 'Atividade do grupo' | 'Organização interna' | 'Evento comunitário';

export type SituacaoAtividade =
  | 'Em planejamento'
  | 'Inscrições abertas'
  | 'Confirmado'
  | 'Concluída'
  | 'Cancelada';

export interface Atividade {
  id: string;
  titulo: string;
  tipo: TipoAtividade;
  grupoId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  vagas: number;
  situacao: SituacaoAtividade;
  descricao: string;
}

export type SituacaoInscricao = 'Confirmada' | 'Lista de espera' | 'Cancelada';

export interface Inscricao {
  id: string;
  atividadeId: string;
  membroId: string;
  situacao: SituacaoInscricao;
  presente: boolean | null;
  criadaEm: string;
}

export type CategoriaComunicado = 'Evento' | 'Organização' | 'Inscrições' | 'Aviso' | 'Informativo';
export type SituacaoComunicado = 'Publicado' | 'Rascunho';

export interface Comunicado {
  id: string;
  titulo: string;
  categoria: CategoriaComunicado;
  publico: string;
  dataPublicacao: string;
  mensagem: string;
  notificar: boolean;
  situacao: SituacaoComunicado;
  criadoEm: string;
}

export type TipoNotificacao = 'inscricao' | 'vaga' | 'comunicado' | 'presenca' | 'demanda' | 'membro';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  descricao: string;
  criadaEm: string;
  lida: boolean;
  link: string;
}

export type Prioridade = 'Alta' | 'Média' | 'Baixa';
export type SituacaoDemanda = 'Aberta' | 'Em andamento' | 'Concluída';
/** Situação exibida na tela: inclui "Atrasada", calculada pelo prazo. */
export type SituacaoDemandaExibida = SituacaoDemanda | 'Atrasada';
export type SituacaoTarefa = 'Pendente' | 'Em andamento' | 'Concluída';

export interface Tarefa {
  id: string;
  titulo: string;
  responsavelId: string;
  prazo: string;
  situacao: SituacaoTarefa;
}

export interface EventoHistorico {
  id: string;
  titulo: string;
  detalhe: string;
  data: string;
}

export interface Demanda {
  id: string;
  codigo: string;
  titulo: string;
  categoria: string;
  prioridade: Prioridade;
  responsavelId: string;
  prazo: string;
  bairro: string;
  grupoId: string;
  situacao: SituacaoDemanda;
  descricao: string;
  tarefas: Tarefa[];
  historico: EventoHistorico[];
  criadaEm: string;
  /** Data em que a demanda foi concluída ("" se ainda não foi). */
  concluidaEm: string;
}

export type Modulo =
  | 'membros'
  | 'grupos'
  | 'atividades'
  | 'inscricoes'
  | 'comunicados'
  | 'demandas'
  | 'relatorios'
  | 'administracao';

export type Acao = 'visualizar' | 'criar' | 'editar' | 'excluir';

export type Permissoes = Record<Modulo, Record<Acao, boolean>>;

export interface Perfil {
  id: string;
  nome: string;
  descricao: string;
  permissoes: Permissoes;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfilId: string;
  situacao: SituacaoCadastro;
  ultimoAcesso: string;
}

export type TipoArquivo = 'PDF' | 'DOCX' | 'XLSX';

export interface VinculoDocumento {
  tipo: 'modulo' | 'grupo' | 'atividade' | 'demanda';
  id: string;
  rotulo: string;
}

export interface Documento {
  id: string;
  nome: string;
  tipo: TipoArquivo;
  vinculo: VinculoDocumento;
  enviadoPor: string;
  data: string;
  tamanho: number;
  /** true quando o arquivo foi enviado pelo sistema e está salvo no navegador. */
  temArquivo: boolean;
}

export type TipoRelatorio = 'membros' | 'atividades' | 'inscricoes' | 'demandas';
export type FormatoRelatorio = 'PDF' | 'XLSX';

export interface RelatorioGerado {
  id: string;
  tipo: TipoRelatorio;
  /** Mês no formato "aaaa-mm". */
  periodo: string;
  formato: FormatoRelatorio;
  geradoPor: string;
  geradoEm: string;
}
