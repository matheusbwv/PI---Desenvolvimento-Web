// Perfis de acesso que o sistema cria quando o banco é novo.
// As permissões podem ser mudadas depois em Administração › Perfis e permissões.
import { inserir, transacao, um } from './banco.ts';
import { ACOES, MODULOS } from './consultas.ts';
import type { Acao, Modulo } from '../src/types.ts';

/** O perfil Administrador sempre tem acesso total e não pode ser alterado. */
export const PERFIL_ADMIN = 'p-admin';

// Letras de cada módulo: V = visualizar, C = criar, E = editar, X = excluir.
const PERFIS_PADRAO: { id: string; nome: string; descricao: string; permissoes: Record<Modulo, string> }[] = [
  {
    id: PERFIL_ADMIN,
    nome: 'Administrador',
    descricao: 'Acesso total',
    permissoes: {
      membros: 'VCEX', grupos: 'VCEX', atividades: 'VCEX', inscricoes: 'VCEX',
      comunicados: 'VCEX', demandas: 'VCEX', relatorios: 'VCEX', administracao: 'VCEX',
    },
  },
  {
    id: 'p-coord',
    nome: 'Coordenador',
    descricao: 'Gerencia grupos e atividades',
    permissoes: {
      membros: 'VCE', grupos: 'VCE', atividades: 'VCEX', inscricoes: 'VCE',
      comunicados: 'VCE', demandas: 'VCE', relatorios: 'V', administracao: '',
    },
  },
  {
    id: 'p-oper',
    nome: 'Operador',
    descricao: 'Cadastros e presença',
    permissoes: {
      membros: 'VCE', grupos: 'V', atividades: 'V', inscricoes: 'VCE',
      comunicados: 'V', demandas: 'VC', relatorios: '', administracao: '',
    },
  },
  {
    id: 'p-cons',
    nome: 'Consulta',
    descricao: 'Somente leitura',
    permissoes: {
      membros: 'V', grupos: 'V', atividades: 'V', inscricoes: 'V',
      comunicados: 'V', demandas: 'V', relatorios: 'V', administracao: '',
    },
  },
];

const LETRA: Record<Acao, string> = { visualizar: 'V', criar: 'C', editar: 'E', excluir: 'X' };

/** Cria os perfis padrão se o banco ainda não tiver nenhum. Os outros dados começam vazios. */
export function criarPerfisPadrao(): boolean {
  if (um('SELECT 1 FROM perfis LIMIT 1')) return false;
  transacao(() => {
    for (const perfil of PERFIS_PADRAO) {
      inserir('perfis', { id: perfil.id, nome: perfil.nome, descricao: perfil.descricao });
      for (const modulo of MODULOS) {
        inserir('permissoes', {
          perfilId: perfil.id,
          modulo,
          ...Object.fromEntries(ACOES.map((a) => [a, perfil.permissoes[modulo].includes(LETRA[a]) ? 1 : 0])),
        });
      }
    }
  });
  return true;
}
