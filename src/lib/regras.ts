import type {
  Atividade,
  CategoriaComunicado,
  Demanda,
  Grupo,
  Inscricao,
  Prioridade,
  SituacaoAtividade,
  SituacaoDemandaExibida,
  SituacaoInscricao,
  SituacaoTarefa,
  TipoArquivo,
} from '@/types';
import type { TomSelo } from '@/components/ui/Selo';
import { hojeISO } from '@/lib/formatacao';

// ---------------------------------------------------------------- Cores dos selos
export const tomCadastro = (s: string): TomSelo => (s === 'Ativo' ? 'verde' : 'vermelho');

export const tomAtividade: Record<SituacaoAtividade, TomSelo> = {
  'Inscrições abertas': 'azul',
  Confirmado: 'verde',
  'Em planejamento': 'laranja',
  Concluída: 'cinza',
  Cancelada: 'vermelho',
};

export const tomInscricao: Record<SituacaoInscricao, TomSelo> = {
  Confirmada: 'verde',
  'Lista de espera': 'laranja',
  Cancelada: 'vermelho',
};

export const tomCategoriaComunicado: Record<CategoriaComunicado, TomSelo> = {
  Evento: 'azul',
  Organização: 'roxo',
  Inscrições: 'roxo',
  Aviso: 'laranja',
  Informativo: 'azul',
};

export const tomPrioridade: Record<Prioridade, TomSelo> = { Alta: 'vermelho', Média: 'laranja', Baixa: 'cinza' };

export const tomDemanda: Record<SituacaoDemandaExibida, TomSelo> = {
  Aberta: 'cinza',
  'Em andamento': 'azul',
  Concluída: 'verde',
  Atrasada: 'vermelho',
};

export const tomTarefa: Record<SituacaoTarefa, TomSelo> = {
  Pendente: 'cinza',
  'Em andamento': 'azul',
  Concluída: 'verde',
};

export const tomArquivo: Record<TipoArquivo, TomSelo> = { PDF: 'vermelho', XLSX: 'verde', DOCX: 'azul' };

export function tomPerfil(nome: string): TomSelo {
  if (nome === 'Administrador') return 'roxo';
  if (nome === 'Coordenador') return 'azul';
  return 'cinza';
}

// ---------------------------------------------------------------- Demandas
/** Uma demanda não concluída com prazo vencido aparece como "Atrasada". */
export function situacaoDemanda(d: Demanda, hoje = hojeISO()): SituacaoDemandaExibida {
  if (d.situacao !== 'Concluída' && d.prazo && d.prazo < hoje) return 'Atrasada';
  return d.situacao;
}

/** Percentual de tarefas concluídas (0 a 100). */
export function progressoDemanda(d: Demanda): number {
  if (d.tarefas.length === 0) return d.situacao === 'Concluída' ? 100 : 0;
  const feitas = d.tarefas.filter((t) => t.situacao === 'Concluída').length;
  return Math.round((feitas / d.tarefas.length) * 100);
}

// ---------------------------------------------------------------- Atividades
/** Texto de apoio da atividade: "Grupo Jovens em Ação", "Organização interna"... */
export function origemAtividade(a: Atividade, grupos: Grupo[]): string {
  if (a.tipo === 'Atividade do grupo') {
    const grupo = grupos.find((g) => g.id === a.grupoId);
    return grupo ? `Grupo ${grupo.nome}` : 'Atividade do grupo';
  }
  return a.tipo === 'Evento comunitário' ? 'Evento Comunitário' : a.tipo;
}

export function resumoVagas(a: Atividade, inscricoes: Inscricao[]) {
  const daAtividade = inscricoes.filter((i) => i.atividadeId === a.id);
  const confirmadas = daAtividade.filter((i) => i.situacao === 'Confirmada');
  const espera = daAtividade.filter((i) => i.situacao === 'Lista de espera');
  const presentes = confirmadas.filter((i) => i.presente === true).length;
  const comPresenca = confirmadas.filter((i) => i.presente !== null).length;
  return {
    confirmadas: confirmadas.length,
    espera: espera.length,
    livres: Math.max(0, a.vagas - confirmadas.length),
    presentes,
    taxaPresenca: comPresenca > 0 ? Math.round((presentes / comPresenca) * 100) : null,
  };
}

/** Atividades a partir de hoje, em ordem de data e horário. */
export function proximasAtividades(atividades: Atividade[], hoje = hojeISO()): Atividade[] {
  return atividades
    .filter((a) => a.data >= hoje && a.situacao !== 'Cancelada' && a.situacao !== 'Concluída')
    .sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio));
}
