// Inscrições, lista de espera e presença.
import { Router } from 'express';
import { z } from 'zod';
import { exigir } from '../auth.ts';
import { executar, inserir, transacao, um } from '../banco.ts';
import { listarInscricoes } from '../consultas.ts';
import { agoraISO, ErroHttp, formatarData, gerarId, naoEncontrado, notificar, validar } from '../util.ts';
import type { Atividade, Inscricao, Membro } from '../../src/types.ts';

export const inscricoes = Router();

const buscarInscricao = (id: string) => listarInscricoes().find((i) => i.id === id);
const buscarAtividade = (id: string) => um<Atividade>('SELECT * FROM atividades WHERE id = ?', id);
const confirmadasNa = (atividadeId: string) =>
  um<{ n: number }>("SELECT COUNT(*) AS n FROM inscricoes WHERE atividadeId = ? AND situacao = 'Confirmada'", atividadeId)?.n ?? 0;

/** Inscreve um membro. Se não houver vaga, ele entra na lista de espera. */
inscricoes.post('/inscricoes', exigir('inscricoes', 'criar'), (req, res) => {
  const { atividadeId, membroId } = validar(z.object({ atividadeId: z.string().min(1), membroId: z.string().min(1) }), req.body);

  const resultado = transacao(() => {
    const atividade = buscarAtividade(atividadeId);
    const membro = um<Membro>('SELECT * FROM membros WHERE id = ?', membroId);
    if (!atividade || !membro) throw new ErroHttp(404, 'Atividade ou membro não encontrado.');
    if (atividade.situacao === 'Cancelada' || atividade.situacao === 'Concluída') {
      throw new ErroHttp(409, `Não é possível se inscrever: a atividade está ${atividade.situacao.toLowerCase()}.`);
    }
    if (membro.situacao === 'Inativo') throw new ErroHttp(409, 'Membros inativos não podem ser inscritos.');
    const repetida = um(
      "SELECT 1 FROM inscricoes WHERE atividadeId = ? AND membroId = ? AND situacao <> 'Cancelada'",
      atividadeId,
      membroId,
    );
    if (repetida) throw new ErroHttp(409, 'Este membro já está inscrito nesta atividade.');

    const situacao: Inscricao['situacao'] = confirmadasNa(atividadeId) < atividade.vagas ? 'Confirmada' : 'Lista de espera';
    const id = gerarId();
    inserir('inscricoes', { id, atividadeId, membroId, situacao, presente: null, criadaEm: agoraISO() });
    notificar({
      tipo: 'inscricao',
      titulo: `Nova inscrição na ${atividade.titulo}`,
      descricao: situacao === 'Confirmada' ? `${membro.nome} se inscreveu` : `${membro.nome} entrou na lista de espera`,
      link: `/atividades/${atividadeId}`,
    });
    return {
      inscricao: buscarInscricao(id),
      mensagem: situacao === 'Confirmada' ? 'Inscrição confirmada.' : 'Não há vagas: o membro entrou na lista de espera.',
    };
  });
  res.status(201).json(resultado);
});

/** Cancela a inscrição. Se liberou uma vaga e há fila, avisa para promover o próximo. */
inscricoes.post('/inscricoes/:id/cancelar', exigir('inscricoes', 'editar'), (req, res) => {
  transacao(() => {
    const inscricao = buscarInscricao(req.params.id);
    if (!inscricao) throw naoEncontrado('Inscrição');
    if (inscricao.situacao === 'Cancelada') return;
    executar("UPDATE inscricoes SET situacao = 'Cancelada', presente = NULL WHERE id = ?", inscricao.id);
    const temEspera = um("SELECT 1 FROM inscricoes WHERE atividadeId = ? AND situacao = 'Lista de espera'", inscricao.atividadeId);
    if (inscricao.situacao === 'Confirmada' && temEspera) {
      const atividade = buscarAtividade(inscricao.atividadeId);
      notificar({
        tipo: 'vaga',
        titulo: `Vaga liberada na ${atividade?.titulo ?? 'atividade'}`,
        descricao: 'Primeiro da lista de espera pode ser promovido',
        link: `/atividades/${inscricao.atividadeId}`,
      });
    }
  });
  res.json(buscarInscricao(req.params.id));
});

/** Passa alguém da lista de espera para confirmado, se houver vaga. */
inscricoes.post('/inscricoes/:id/promover', exigir('inscricoes', 'editar'), (req, res) => {
  transacao(() => {
    const inscricao = buscarInscricao(req.params.id);
    if (!inscricao) throw naoEncontrado('Inscrição');
    if (inscricao.situacao !== 'Lista de espera') throw new ErroHttp(409, 'Só é possível promover quem está na lista de espera.');
    const atividade = buscarAtividade(inscricao.atividadeId);
    if (!atividade) throw naoEncontrado('Atividade');
    if (confirmadasNa(atividade.id) >= atividade.vagas) throw new ErroHttp(409, 'Não há vagas livres nesta atividade.');
    executar("UPDATE inscricoes SET situacao = 'Confirmada' WHERE id = ?", inscricao.id);
  });
  res.json({ inscricao: buscarInscricao(req.params.id), mensagem: 'Inscrição promovida para confirmada.' });
});

/** Marca presença (true), falta (false) ou limpa (null). */
inscricoes.patch('/inscricoes/:id/presenca', exigir('inscricoes', 'editar'), (req, res) => {
  const { presente } = validar(z.object({ presente: z.boolean().nullable() }), req.body);
  const inscricao = buscarInscricao(req.params.id);
  if (!inscricao) throw naoEncontrado('Inscrição');
  if (inscricao.situacao !== 'Confirmada') throw new ErroHttp(409, 'Só inscrições confirmadas recebem presença.');
  executar('UPDATE inscricoes SET presente = ? WHERE id = ?', presente === null ? null : presente ? 1 : 0, inscricao.id);
  res.json(buscarInscricao(req.params.id));
});

/** Fecha a lista de presença da sessão e avisa nas notificações. */
inscricoes.post('/atividades/:id/presenca', exigir('inscricoes', 'editar'), (req, res) => {
  const atividade = buscarAtividade(req.params.id);
  if (!atividade) throw naoEncontrado('Atividade');
  notificar({
    tipo: 'presenca',
    titulo: 'Presença registrada',
    descricao: `Sessão de ${formatarData(atividade.data)} salva com sucesso`,
    link: `/atividades/${atividade.id}`,
  });
  res.status(204).end();
});
