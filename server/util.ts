import { randomUUID } from 'node:crypto';
import { format } from 'date-fns';
import type { z } from 'zod';
import { inserir, um } from './banco.ts';
import type { Notificacao } from '../src/types.ts';

/** Erro com código HTTP; a mensagem aparece para o usuário na tela. */
export class ErroHttp extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

export const naoEncontrado = (oQue: string) => new ErroHttp(404, `${oQue} não encontrado(a).`);

export const gerarId = () => randomUUID();
export const hojeISO = () => format(new Date(), 'yyyy-MM-dd');
export const agoraISO = () => new Date().toISOString();

/** "2026-11-15" -> "15/11/2026" */
export function formatarData(iso: string): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Confere o corpo da requisição com o esquema do Zod; se algo estiver errado, responde 400. */
export function validar<T extends z.ZodType>(esquema: T, corpo: unknown): z.infer<T> {
  const resultado = esquema.safeParse(corpo);
  if (!resultado.success) {
    const problema = resultado.error.issues[0];
    const campo = problema.path.join('.');
    throw new ErroHttp(400, campo ? `Campo "${campo}": ${problema.message}` : problema.message);
  }
  return resultado.data;
}

/** Próximo código sequencial de uma tabela ("026", "D-013"...). */
export function proximoCodigo(tabela: string, digitos: number, prefixo = ''): string {
  const linha = um<{ maior: number | null }>(
    `SELECT MAX(CAST(REPLACE(codigo, ?, '') AS INTEGER)) AS maior FROM ${tabela}`,
    prefixo,
  );
  return `${prefixo}${String((linha?.maior ?? 0) + 1).padStart(digitos, '0')}`;
}

/** Cria uma notificação para todos os usuários. */
export function notificar(n: Omit<Notificacao, 'id' | 'criadaEm' | 'lida'>) {
  inserir('notificacoes', { id: gerarId(), criadaEm: agoraISO(), ...n });
}

export const bool = (v: unknown) => v === 1 || v === true;
export const bit = (v: boolean) => (v ? 1 : 0);
