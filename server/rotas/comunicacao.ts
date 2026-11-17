// Comunicados e notificações.
import { Router } from 'express';
import { z } from 'zod';
import { exigir, usuarioDe } from '../auth.ts';
import { atualizar, executar, inserir, transacao } from '../banco.ts';
import { listarComunicados } from '../consultas.ts';
import { agoraISO, bit, gerarId, hojeISO, naoEncontrado, notificar, validar } from '../util.ts';
import type { Comunicado } from '../../src/types.ts';

export const comunicacao = Router();

const esquemaComunicado = z.object({
  titulo: z.string().trim().min(3, 'informe o título (mínimo de 3 letras)').max(150),
  categoria: z.enum(['Evento', 'Organização', 'Inscrições', 'Aviso', 'Informativo']),
  // Sem escolher, vai para todos os membros (igual à tela).
  publico: z.preprocess((v) => (typeof v === 'string' && v.trim()) || 'Todos os membros', z.string().trim().max(100)),
  dataPublicacao: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).default(''),
  mensagem: z.string().trim().min(1, 'escreva a mensagem').max(5000),
  notificar: z.boolean().default(false),
  situacao: z.enum(['Publicado', 'Rascunho']),
});

const buscarComunicado = (id: string) => listarComunicados().find((c) => c.id === id);

/** Grava o comunicado. Na primeira vez que for publicado (com "notificar"), avisa todo mundo. */
function salvar(dados: Omit<Comunicado, 'id' | 'criadoEm'>, anterior?: Comunicado): Comunicado {
  const salvo: Comunicado = anterior ? { ...anterior, ...dados } : { ...dados, id: gerarId(), criadoEm: agoraISO() };
  if (salvo.situacao === 'Publicado' && !salvo.dataPublicacao) salvo.dataPublicacao = hojeISO();
  const { id, criadoEm, ...campos } = salvo;
  transacao(() => {
    if (anterior) atualizar('comunicados', id, { ...campos, notificar: bit(campos.notificar) });
    else inserir('comunicados', { id, criadoEm, ...campos, notificar: bit(campos.notificar) });
    if (salvo.situacao === 'Publicado' && anterior?.situacao !== 'Publicado' && salvo.notificar) {
      notificar({ tipo: 'comunicado', titulo: 'Comunicado publicado', descricao: salvo.titulo, link: `/comunicados/${id}/editar` });
    }
  });
  return buscarComunicado(id)!;
}

comunicacao.post('/comunicados', exigir('comunicados', 'criar'), (req, res) => {
  res.status(201).json(salvar(validar(esquemaComunicado, req.body)));
});

comunicacao.put('/comunicados/:id', exigir('comunicados', 'editar'), (req, res) => {
  const anterior = buscarComunicado(req.params.id);
  if (!anterior) throw naoEncontrado('Comunicado');
  res.json(salvar(validar(esquemaComunicado, req.body), anterior));
});

comunicacao.post('/comunicados/:id/publicar', exigir('comunicados', 'editar'), (req, res) => {
  const anterior = buscarComunicado(req.params.id);
  if (!anterior) throw naoEncontrado('Comunicado');
  const { id: _id, criadoEm: _c, ...resto } = anterior;
  res.json(salvar({ ...resto, situacao: 'Publicado', notificar: true }, anterior));
});

comunicacao.delete('/comunicados/:id', exigir('comunicados', 'excluir'), (req, res) => {
  if (!executar('DELETE FROM comunicados WHERE id = ?', req.params.id)) throw naoEncontrado('Comunicado');
  res.status(204).end();
});

// ------------------------------------------------------------ Notificações
// Cada usuário marca as próprias notificações como lidas.
comunicacao.post('/notificacoes/:id/lida', (req, res) => {
  executar(
    'INSERT OR IGNORE INTO notificacoesLidas (notificacaoId, usuarioId) SELECT id, ? FROM notificacoes WHERE id = ?',
    usuarioDe(res).id,
    req.params.id,
  );
  res.status(204).end();
});

comunicacao.post('/notificacoes/lidas', (_req, res) => {
  executar('INSERT OR IGNORE INTO notificacoesLidas (notificacaoId, usuarioId) SELECT id, ? FROM notificacoes', usuarioDe(res).id);
  res.status(204).end();
});
