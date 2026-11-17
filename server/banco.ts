import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

// O banco é um arquivo SQLite em server/dados/sesfa.db (ou na pasta de SESFA_DADOS).
// O SQLite já vem no Node.js, então não é preciso instalar um servidor de banco.
export const PASTA_DADOS = process.env.SESFA_DADOS ?? join(import.meta.dirname, 'dados');
export const PASTA_ARQUIVOS = join(PASTA_DADOS, 'arquivos');
mkdirSync(PASTA_ARQUIVOS, { recursive: true });

export const banco = new DatabaseSync(join(PASTA_DADOS, 'sesfa.db'));
banco.exec(readFileSync(join(import.meta.dirname, 'esquema.sql'), 'utf8'));

/** Todas as linhas de uma consulta. */
export function todos<T>(sql: string, ...parametros: SQLInputValue[]): T[] {
  return banco.prepare(sql).all(...parametros) as unknown as T[];
}

/** A primeira linha de uma consulta (ou undefined). */
export function um<T>(sql: string, ...parametros: SQLInputValue[]): T | undefined {
  return banco.prepare(sql).get(...parametros) as unknown as T | undefined;
}

/** Executa um INSERT, UPDATE ou DELETE e diz quantas linhas mudaram. */
export function executar(sql: string, ...parametros: SQLInputValue[]): number {
  return Number(banco.prepare(sql).run(...parametros).changes);
}

/** Insere um objeto em uma tabela usando as chaves dele como nomes das colunas. */
export function inserir(tabela: string, linha: Record<string, SQLInputValue>) {
  const colunas = Object.keys(linha);
  executar(
    `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`,
    ...colunas.map((c) => linha[c]),
  );
}

/** Atualiza as colunas informadas de uma linha, pelo id. */
export function atualizar(tabela: string, id: string, campos: Record<string, SQLInputValue>): number {
  const colunas = Object.keys(campos);
  if (colunas.length === 0) return 0;
  return executar(
    `UPDATE ${tabela} SET ${colunas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
    ...colunas.map((c) => campos[c]),
    id,
  );
}

/** Roda várias operações como uma só: ou todas são gravadas, ou nenhuma. */
export function transacao<T>(operacoes: () => T): T {
  banco.exec('BEGIN');
  try {
    const resultado = operacoes();
    banco.exec('COMMIT');
    return resultado;
  } catch (erro) {
    banco.exec('ROLLBACK');
    throw erro;
  }
}
