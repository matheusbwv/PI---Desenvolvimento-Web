// Usuários e perfis de acesso.
import { Router } from 'express';
import { z } from 'zod';
import { criptografarSenha, exigir, usuarioDe } from '../auth.ts';
import { atualizar, executar, inserir, transacao, um } from '../banco.ts';
import { ACOES, listarPerfis, listarUsuarios, MODULOS } from '../consultas.ts';
import { PERFIL_ADMIN } from '../perfis.ts';
import { bit, ErroHttp, gerarId, naoEncontrado, validar } from '../util.ts';

export const administracao = Router();

const senha = z.string().min(6, 'a senha precisa ter pelo menos 6 caracteres').max(72);
const esquemaUsuario = z.object({
  nome: z.string().trim().min(3, 'informe o nome (mínimo de 3 letras)').max(120),
  email: z.string().trim().toLowerCase().regex(/^\S+@\S+\.\S+$/, 'informe um e-mail válido'),
  perfilId: z.string().min(1, 'selecione o perfil'),
  situacao: z.enum(['Ativo', 'Inativo']).default('Ativo'),
  // Obrigatória ao criar. Ao editar, só muda se for informada.
  senha: z.union([senha, z.literal('')]).default(''),
});

const buscarUsuario = (id: string) => listarUsuarios(true).find((u) => u.id === id);

function conferir(dados: z.infer<typeof esquemaUsuario>, id?: string) {
  if (!um('SELECT 1 FROM perfis WHERE id = ?', dados.perfilId)) throw new ErroHttp(400, 'O perfil escolhido não existe.');
  if (um('SELECT 1 FROM usuarios WHERE email = ? AND id <> ?', dados.email, id ?? '')) {
    throw new ErroHttp(409, 'Já existe um usuário com este e-mail.');
  }
}

administracao.post('/usuarios', exigir('administracao', 'criar'), async (req, res) => {
  const { senha: senhaInicial, ...dados } = validar(esquemaUsuario, req.body);
  if (!senhaInicial) throw new ErroHttp(400, 'Defina uma senha inicial para o usuário.');
  conferir({ ...dados, senha: senhaInicial });
  const id = gerarId();
  inserir('usuarios', { ...dados, id, senhaHash: await criptografarSenha(senhaInicial), ultimoAcesso: '' });
  res.status(201).json(buscarUsuario(id));
});

administracao.put('/usuarios/:id', exigir('administracao', 'editar'), async (req, res) => {
  const { senha: novaSenha, ...dados } = validar(esquemaUsuario, req.body);
  const atual = buscarUsuario(req.params.id);
  if (!atual) throw naoEncontrado('Usuário');
  conferir({ ...dados, senha: novaSenha }, atual.id);
  // Ninguém tira o próprio acesso sem querer.
  if (atual.id === usuarioDe(res).id && (dados.perfilId !== atual.perfilId || dados.situacao !== atual.situacao)) {
    throw new ErroHttp(409, 'Você não pode mudar o próprio perfil nem a própria situação.');
  }
  atualizar('usuarios', atual.id, { ...dados, ...(novaSenha ? { senhaHash: await criptografarSenha(novaSenha) } : {}) });
  res.json(buscarUsuario(atual.id));
});

administracao.patch('/usuarios/:id/situacao', exigir('administracao', 'editar'), (req, res) => {
  if (req.params.id === usuarioDe(res).id) throw new ErroHttp(409, 'Você não pode desativar a própria conta.');
  const mudou = executar(
    "UPDATE usuarios SET situacao = CASE situacao WHEN 'Ativo' THEN 'Inativo' ELSE 'Ativo' END WHERE id = ?",
    req.params.id,
  );
  if (!mudou) throw naoEncontrado('Usuário');
  res.json(buscarUsuario(req.params.id));
});

administracao.delete('/usuarios/:id', exigir('administracao', 'excluir'), (req, res) => {
  if (req.params.id === usuarioDe(res).id) throw new ErroHttp(409, 'Você não pode excluir a própria conta.');
  // Grupos, demandas e tarefas que estavam com essa pessoa ficam sem responsável.
  const apagou = transacao(() => {
    for (const tabela of ['grupos', 'demandas', 'tarefas']) {
      executar(`UPDATE ${tabela} SET responsavelId = '' WHERE responsavelId = ?`, req.params.id);
    }
    return executar('DELETE FROM usuarios WHERE id = ?', req.params.id);
  });
  if (!apagou) throw naoEncontrado('Usuário');
  res.status(204).end();
});

// ------------------------------------------------------------------ Perfis
const linhaPermissao = z.object({ visualizar: z.boolean(), criar: z.boolean(), editar: z.boolean(), excluir: z.boolean() });
const esquemaPerfis = z.array(
  z.object({
    id: z.string(),
    permissoes: z.record(z.enum(MODULOS as [string, ...string[]]), linhaPermissao),
  }),
);

administracao.put('/perfis', exigir('administracao', 'editar'), (req, res) => {
  const perfis = validar(esquemaPerfis, req.body);
  transacao(() => {
    for (const perfil of perfis) {
      if (perfil.id === PERFIL_ADMIN) continue;
      if (!um('SELECT 1 FROM perfis WHERE id = ?', perfil.id)) throw naoEncontrado('Perfil');
      for (const modulo of MODULOS) {
        const linha = perfil.permissoes[modulo];
        if (!linha) continue;
        // Qualquer ação exige poder visualizar o módulo.
        const ve = linha.visualizar || linha.criar || linha.editar || linha.excluir;
        const valores = { ...linha, visualizar: ve };
        executar(
          `INSERT INTO permissoes (perfilId, modulo, ${ACOES.join(', ')}) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (perfilId, modulo) DO UPDATE SET
             visualizar = excluded.visualizar, criar = excluded.criar, editar = excluded.editar, excluir = excluded.excluir`,
          perfil.id,
          modulo,
          ...ACOES.map((a) => bit(valores[a])),
        );
      }
    }
  });
  res.json(listarPerfis());
});
