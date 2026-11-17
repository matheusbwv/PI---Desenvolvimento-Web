// Login com senha criptografada (bcrypt) e token JWT.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { executar, inserir, PASTA_DADOS, transacao, um } from './banco.ts';
import { permissoesDoPerfil } from './consultas.ts';
import { PERFIL_ADMIN } from './perfis.ts';
import { agoraISO, ErroHttp, gerarId } from './util.ts';
import type { Acao, Modulo, Permissoes, Usuario } from '../src/types.ts';

/** Segredo que assina os tokens. Fica em server/dados/segredo.txt (ou em SESFA_SEGREDO). */
function lerSegredo(): string {
  if (process.env.SESFA_SEGREDO) return process.env.SESFA_SEGREDO;
  const arquivo = join(PASTA_DADOS, 'segredo.txt');
  if (!existsSync(arquivo)) writeFileSync(arquivo, randomBytes(48).toString('hex'));
  return readFileSync(arquivo, 'utf8').trim();
}
const SEGREDO = lerSegredo();

export const RODADAS_BCRYPT = 10;
export const criptografarSenha = (senha: string) => bcrypt.hash(senha, RODADAS_BCRYPT);

// Hash qualquer, usado quando o usuário não existe, para a resposta demorar o mesmo tempo.
const HASH_FALSO = bcrypt.hashSync(randomBytes(16).toString('hex'), RODADAS_BCRYPT);

export interface UsuarioLogado extends Usuario {
  permissoes: Permissoes;
}

type LinhaUsuario = Usuario & { senhaHash: string };

/** Confere login e senha. Aceita o e-mail completo ou só a parte antes do @. */
export async function entrar(login: string, senha: string, lembrar: boolean) {
  const texto = login.trim().toLowerCase();
  const usuario = um<LinhaUsuario>(
    `SELECT * FROM usuarios
      WHERE lower(email) = ? OR lower(substr(email, 1, instr(email, '@') - 1)) = ?`,
    texto,
    texto,
  );
  const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);
  if (!usuario || !senhaConfere) throw new ErroHttp(401, 'Usuário ou senha inválidos.');
  if (usuario.situacao === 'Inativo') throw new ErroHttp(403, 'Este usuário está inativo. Procure o administrador.');

  const ultimoAcesso = agoraISO();
  executar('UPDATE usuarios SET ultimoAcesso = ? WHERE id = ?', ultimoAcesso, usuario.id);
  // "Lembrar de mim": o token vale 30 dias. Sem marcar: 12 horas.
  const token = jwt.sign({}, SEGREDO, { subject: usuario.id, expiresIn: lembrar ? '30d' : '12h' });
  const { senhaHash: _, ...dados } = usuario;
  return { token, usuario: { ...dados, ultimoAcesso } };
}

/** Banco sem nenhum usuário: a primeira pessoa a abrir o sistema cadastra o administrador. */
export const precisaPrimeiroAcesso = () => !um('SELECT 1 FROM usuarios LIMIT 1');

/** Cria a conta do primeiro administrador e já entra com ela. Só funciona com o banco sem usuários. */
export async function criarPrimeiroAdministrador(nome: string, email: string, senha: string) {
  const senhaHash = await criptografarSenha(senha);
  transacao(() => {
    if (!precisaPrimeiroAcesso()) throw new ErroHttp(409, 'O administrador já foi cadastrado. Entre com o seu usuário.');
    inserir('usuarios', { id: gerarId(), nome, email, senhaHash, perfilId: PERFIL_ADMIN, situacao: 'Ativo', ultimoAcesso: '' });
  });
  return entrar(email, senha, false);
}

/** Middleware: exige um token válido e carrega o usuário e as permissões do perfil dele. */
export function autenticar(req: Request, res: Response, next: NextFunction) {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ');
  if (tipo !== 'Bearer' || !token) throw new ErroHttp(401, 'Faça login para continuar.');
  let usuarioId: string | undefined;
  try {
    usuarioId = jwt.verify(token, SEGREDO).sub as string | undefined;
  } catch {
    throw new ErroHttp(401, 'Sua sessão expirou. Entre de novo.');
  }
  const usuario = usuarioId
    ? um<Usuario>('SELECT id, nome, email, perfilId, situacao, ultimoAcesso FROM usuarios WHERE id = ?', usuarioId)
    : undefined;
  if (!usuario) throw new ErroHttp(401, 'Sua sessão expirou. Entre de novo.');
  if (usuario.situacao === 'Inativo') throw new ErroHttp(401, 'Este usuário foi desativado.');
  res.locals.usuario = { ...usuario, permissoes: permissoesDoPerfil(usuario.perfilId) } satisfies UsuarioLogado;
  next();
}

/** Usuário que fez a requisição (depois de autenticar). */
export const usuarioDe = (res: Response) => res.locals.usuario as UsuarioLogado;

/** Middleware: o perfil do usuário precisa poder fazer a ação no módulo. */
export const exigir =
  (modulo: Modulo, acao: Acao = 'visualizar') =>
  // Parâmetros como Record<string, string>: assim req.params.id chega como texto nas rotas.
  (_req: Request<Record<string, string>>, res: Response, next: NextFunction) => {
  if (!usuarioDe(res).permissoes[modulo][acao]) {
    throw new ErroHttp(403, 'Seu perfil não tem permissão para fazer isso.');
  }
  next();
};
