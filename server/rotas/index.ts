// Todas as rotas da API ficam em /api.
import express, { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { autenticar, criarPrimeiroAdministrador, entrar, precisaPrimeiroAcesso, usuarioDe } from '../auth.ts';
import { carregarDados } from '../consultas.ts';
import { ErroHttp, validar } from '../util.ts';
import { administracao } from './administracao.ts';
import { cadastros } from './cadastros.ts';
import { comunicacao } from './comunicacao.ts';
import { demandas } from './demandas.ts';
import { documentos } from './documentos.ts';
import { inscricoes } from './inscricoes.ts';

export const api = Router();

// Envio de documentos manda o arquivo dentro do JSON, então aceita até 30 MB; o resto, o padrão (100 KB).
api.use('/documentos', express.json({ limit: '30mb' }));
api.use(express.json());

// ---------------------------------------------------------------- Públicas
api.get('/saude', (_req, res) => {
  res.json({ ok: true });
});

api.post('/auth/entrar', async (req, res) => {
  const { login, senha, lembrar } = validar(
    z.object({
      login: z.string().trim().min(1, 'informe o usuário ou e-mail'),
      senha: z.string().min(1, 'informe a senha'),
      lembrar: z.boolean().default(false),
    }),
    req.body,
  );
  res.json(await entrar(login, senha, lembrar));
});

/** A tela de login usa para saber se ainda falta cadastrar o primeiro administrador. */
api.get('/auth/situacao', (_req, res) => {
  res.json({ primeiroAcesso: precisaPrimeiroAcesso() });
});

api.post('/auth/primeiro-acesso', async (req, res) => {
  const { nome, email, senha } = validar(
    z.object({
      nome: z.string().trim().min(3, 'informe o nome (mínimo de 3 letras)').max(120),
      email: z.string().trim().toLowerCase().regex(/^\S+@\S+\.\S+$/, 'informe um e-mail válido'),
      senha: z.string().min(6, 'a senha precisa ter pelo menos 6 caracteres').max(72),
    }),
    req.body,
  );
  res.status(201).json(await criarPrimeiroAdministrador(nome, email, senha));
});

// ------------------------------------------------------- Precisam de login
api.use(autenticar);

api.get('/auth/eu', (_req, res) => {
  const { permissoes: _, ...usuario } = usuarioDe(res);
  res.json(usuario);
});

/** Tudo o que as telas precisam de uma vez (o volume de dados de uma comunidade é pequeno). */
api.get('/dados', (_req, res) => {
  const usuario = usuarioDe(res);
  res.json(carregarDados(usuario.id, usuario.permissoes));
});

api.use(cadastros);
api.use(inscricoes);
api.use(comunicacao);
api.use(demandas);
api.use(documentos);
api.use(administracao);

api.use((_req, _res, next) => next(new ErroHttp(404, 'Rota da API não encontrada.')));

/** Transforma qualquer erro em JSON { erro } com o código HTTP certo. */
export function tratarErros(erro: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (erro instanceof ErroHttp) {
    res.status(erro.status).json({ erro: erro.message });
    return;
  }
  const status = (erro as { status?: number; type?: string }).status;
  if (status === 413) {
    res.status(413).json({ erro: 'O arquivo é grande demais.' });
    return;
  }
  if (status === 400) {
    res.status(400).json({ erro: 'Requisição inválida.' });
    return;
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor. Tente de novo.' });
}
