// Membros, grupos e atividades.
import { Router } from 'express';
import { z } from 'zod';
import { exigir } from '../auth.ts';
import { atualizar, executar, inserir, transacao, um } from '../banco.ts';
import { listarAtividades, listarGrupos, listarMembros } from '../consultas.ts';
import { ErroHttp, gerarId, hojeISO, naoEncontrado, notificar, proximoCodigo, validar } from '../util.ts';

export const cadastros = Router();

const texto = z.string().trim().max(500).default('');
// Sem escolher, o cadastro fica como Ativo.
const situacaoCadastro = z.preprocess((v) => v || 'Ativo', z.enum(['Ativo', 'Inativo']));
const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use o formato aaaa-mm-dd');
const dataOpcional = z.union([dataISO, z.literal('')]).default('');

const existe = (tabela: string, id: string) => !!um(`SELECT 1 FROM ${tabela} WHERE id = ?`, id);
const alternarSituacao = (tabela: string, id: string) =>
  executar(`UPDATE ${tabela} SET situacao = CASE situacao WHEN 'Ativo' THEN 'Inativo' ELSE 'Ativo' END WHERE id = ?`, id);

// ---------------------------------------------------------------- Membros
const esquemaMembro = z.object({
  nome: z.string().trim().min(3, 'informe o nome completo (mínimo de 3 letras)').max(120),
  nascimento: dataOpcional.refine((v) => !v || v <= hojeISO(), 'a data de nascimento não pode estar no futuro'),
  identificador: texto,
  telefone: texto.refine((v) => !v || v.replace(/\D/g, '').length >= 10, 'telefone incompleto'),
  email: texto.refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'e-mail inválido'),
  municipio: texto,
  bairro: texto,
  situacao: situacaoCadastro,
});

const buscarMembro = (id: string) => listarMembros().find((m) => m.id === id);

cadastros.post('/membros', exigir('membros', 'criar'), (req, res) => {
  const dados = validar(esquemaMembro, req.body);
  const membro = { ...dados, id: gerarId(), codigo: proximoCodigo('membros', 3), criadoEm: hojeISO() };
  transacao(() => {
    inserir('membros', membro);
    notificar({ tipo: 'membro', titulo: 'Novo membro cadastrado', descricao: `${membro.nome} foi adicionado(a)`, link: `/membros/${membro.id}/editar` });
  });
  res.status(201).json(membro);
});

cadastros.put('/membros/:id', exigir('membros', 'editar'), (req, res) => {
  const dados = validar(esquemaMembro, req.body);
  if (!atualizar('membros', req.params.id, dados)) throw naoEncontrado('Membro');
  res.json(buscarMembro(req.params.id));
});

cadastros.patch('/membros/:id/situacao', exigir('membros', 'editar'), (req, res) => {
  if (!alternarSituacao('membros', req.params.id)) throw naoEncontrado('Membro');
  res.json(buscarMembro(req.params.id));
});

// Apagar o membro também apaga as inscrições e a participação dele nos grupos (ON DELETE CASCADE).
cadastros.delete('/membros/:id', exigir('membros', 'excluir'), (req, res) => {
  if (!executar('DELETE FROM membros WHERE id = ?', req.params.id)) throw naoEncontrado('Membro');
  res.status(204).end();
});

// ----------------------------------------------------------------- Grupos
const esquemaGrupo = z.object({
  nome: z.string().trim().min(3, 'informe o nome do grupo (mínimo de 3 letras)').max(120),
  responsavelId: texto,
  objetivo: z.string().trim().max(2000).default(''),
  municipio: texto,
  bairro: texto,
  criadoEm: dataOpcional,
  situacao: situacaoCadastro,
});

const buscarGrupo = (id: string) => listarGrupos().find((g) => g.id === id);

function conferirResponsavel(id: string) {
  if (id && !existe('usuarios', id)) throw new ErroHttp(400, 'O responsável escolhido não existe.');
}

cadastros.post('/grupos', exigir('grupos', 'criar'), (req, res) => {
  const dados = validar(esquemaGrupo, req.body);
  conferirResponsavel(dados.responsavelId);
  const grupo = { ...dados, id: gerarId(), codigo: proximoCodigo('grupos', 2), criadoEm: dados.criadoEm || hojeISO() };
  inserir('grupos', grupo);
  res.status(201).json(buscarGrupo(grupo.id));
});

cadastros.put('/grupos/:id', exigir('grupos', 'editar'), (req, res) => {
  const dados = validar(esquemaGrupo, req.body);
  conferirResponsavel(dados.responsavelId);
  const { criadoEm, ...resto } = dados;
  if (!atualizar('grupos', req.params.id, criadoEm ? dados : resto)) throw naoEncontrado('Grupo');
  res.json(buscarGrupo(req.params.id));
});

cadastros.patch('/grupos/:id/situacao', exigir('grupos', 'editar'), (req, res) => {
  if (!alternarSituacao('grupos', req.params.id)) throw naoEncontrado('Grupo');
  res.json(buscarGrupo(req.params.id));
});

// Atividades e demandas do grupo continuam existindo, só ficam sem grupo.
cadastros.delete('/grupos/:id', exigir('grupos', 'excluir'), (req, res) => {
  const apagou = transacao(() => {
    executar("UPDATE atividades SET grupoId = '' WHERE grupoId = ?", req.params.id);
    executar("UPDATE demandas SET grupoId = '' WHERE grupoId = ?", req.params.id);
    return executar('DELETE FROM grupos WHERE id = ?', req.params.id);
  });
  if (!apagou) throw naoEncontrado('Grupo');
  res.status(204).end();
});

cadastros.post('/grupos/:id/membros', exigir('grupos', 'editar'), (req, res) => {
  const { membroIds } = validar(z.object({ membroIds: z.array(z.string()).min(1, 'escolha ao menos um membro') }), req.body);
  if (!existe('grupos', req.params.id)) throw naoEncontrado('Grupo');
  transacao(() => {
    for (const membroId of membroIds) {
      if (!existe('membros', membroId)) throw new ErroHttp(400, 'Um dos membros escolhidos não existe.');
      executar('INSERT OR IGNORE INTO grupoMembros (grupoId, membroId) VALUES (?, ?)', req.params.id, membroId);
    }
  });
  res.json(buscarGrupo(req.params.id));
});

cadastros.delete('/grupos/:id/membros/:membroId', exigir('grupos', 'editar'), (req, res) => {
  executar('DELETE FROM grupoMembros WHERE grupoId = ? AND membroId = ?', req.params.id, req.params.membroId);
  res.json(buscarGrupo(req.params.id));
});

// ------------------------------------------------------------- Atividades
const hora = z.string().regex(/^\d{2}:\d{2}$/, 'use o formato hh:mm');
const esquemaAtividade = z
  .object({
    titulo: z.string().trim().min(3, 'informe o título (mínimo de 3 letras)').max(150),
    tipo: z.enum(['Atividade do grupo', 'Organização interna', 'Evento comunitário']),
    grupoId: texto,
    data: dataISO,
    horaInicio: hora,
    horaFim: hora,
    local: texto,
    vagas: z.coerce.number().int('as vagas precisam ser um número inteiro').min(0).max(10000),
    situacao: z.enum(['Em planejamento', 'Inscrições abertas', 'Confirmado', 'Concluída', 'Cancelada']),
    descricao: z.string().trim().max(2000).default(''),
  })
  .refine((a) => a.horaFim > a.horaInicio, { message: 'o horário de término precisa ser depois do início', path: ['horaFim'] });

const buscarAtividade = (id: string) => listarAtividades().find((a) => a.id === id);

function conferirGrupo(id: string) {
  if (id && !existe('grupos', id)) throw new ErroHttp(400, 'O grupo escolhido não existe.');
}

cadastros.post('/atividades', exigir('atividades', 'criar'), (req, res) => {
  const dados = validar(esquemaAtividade, req.body);
  conferirGrupo(dados.grupoId);
  const atividade = { ...dados, id: gerarId() };
  inserir('atividades', atividade);
  res.status(201).json(atividade);
});

cadastros.put('/atividades/:id', exigir('atividades', 'editar'), (req, res) => {
  const dados = validar(esquemaAtividade, req.body);
  conferirGrupo(dados.grupoId);
  const confirmadas = um<{ n: number }>(
    "SELECT COUNT(*) AS n FROM inscricoes WHERE atividadeId = ? AND situacao = 'Confirmada'",
    req.params.id,
  )?.n ?? 0;
  if (dados.vagas < confirmadas) {
    throw new ErroHttp(400, `Já há ${confirmadas} inscrições confirmadas. Cancele algumas antes de reduzir as vagas para ${dados.vagas}.`);
  }
  if (!atualizar('atividades', req.params.id, dados)) throw naoEncontrado('Atividade');
  res.json(buscarAtividade(req.params.id));
});

// Apagar a atividade também apaga as inscrições dela (ON DELETE CASCADE).
cadastros.delete('/atividades/:id', exigir('atividades', 'excluir'), (req, res) => {
  if (!executar('DELETE FROM atividades WHERE id = ?', req.params.id)) throw naoEncontrado('Atividade');
  res.status(204).end();
});
