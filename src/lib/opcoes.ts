import type {
  Acao,
  CategoriaComunicado,
  Modulo,
  Prioridade,
  SituacaoAtividade,
  SituacaoDemanda,
  SituacaoTarefa,
  TipoAtividade,
} from '@/types';

// Listas usadas nos campos de seleção dos formulários.

export const MUNICIPIOS = ['Juazeiro do Norte', 'Crato', 'Barbalha'];

export const BAIRROS = [
  'Centro',
  'Jardim Esperança',
  'Vila Nova',
  'Parque das Flores',
  'São José',
  'Alto da Boa Vista',
];

export const SITUACOES_CADASTRO = ['Ativo', 'Inativo'] as const;

export const TIPOS_ATIVIDADE: TipoAtividade[] = [
  'Atividade do grupo',
  'Organização interna',
  'Evento comunitário',
];

export const SITUACOES_ATIVIDADE: SituacaoAtividade[] = [
  'Em planejamento',
  'Inscrições abertas',
  'Confirmado',
  'Concluída',
  'Cancelada',
];

export const CATEGORIAS_COMUNICADO: CategoriaComunicado[] = [
  'Evento',
  'Organização',
  'Inscrições',
  'Aviso',
  'Informativo',
];

export const CATEGORIAS_DEMANDA = [
  'Infraestrutura',
  'Assistência',
  'Atividades',
  'Formação',
  'Saúde',
  'Meio ambiente',
];

export const PRIORIDADES: Prioridade[] = ['Alta', 'Média', 'Baixa'];

export const SITUACOES_DEMANDA: SituacaoDemanda[] = ['Aberta', 'Em andamento', 'Concluída'];

export const SITUACOES_TAREFA: SituacaoTarefa[] = ['Pendente', 'Em andamento', 'Concluída'];

export const MODULOS: { id: Modulo; nome: string }[] = [
  { id: 'membros', nome: 'Membros' },
  { id: 'grupos', nome: 'Grupos' },
  { id: 'atividades', nome: 'Atividades' },
  { id: 'inscricoes', nome: 'Inscrições e presença' },
  { id: 'comunicados', nome: 'Comunicados' },
  { id: 'demandas', nome: 'Demandas' },
  { id: 'relatorios', nome: 'Relatórios' },
  { id: 'administracao', nome: 'Administração' },
];

export const ACOES: { id: Acao; nome: string }[] = [
  { id: 'visualizar', nome: 'Visualizar' },
  { id: 'criar', nome: 'Criar' },
  { id: 'editar', nome: 'Editar' },
  { id: 'excluir', nome: 'Excluir' },
];

export const TAMANHO_MAXIMO_ARQUIVO = 20 * 1024 * 1024;

export const ITENS_POR_PAGINA = 5;
