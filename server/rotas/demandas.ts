// Demandas, tarefas e histórico.
import { Router } from 'express';
import { z } from 'zod';
import { exigir, usuarioDe } from '../auth.ts';
import { atualizar, executar, inserir, transacao, um } from '../banco.ts';
import { buscarDemanda } from '../consultas.ts';
import { ErroHttp, formatarData, gerarId, hojeISO, naoEncontrado, notificar, proximoCodigo, validar } from '../util.ts';
import type { SituacaoTarefa, Tarefa } from '../../src/types.ts';

export const demandas = Router();

const texto = z.string().trim().max(500).default('');
const dataOpcional = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use o formato aaaa-mm-dd'), z.literal('')]).default('');
const situacaoTarefa = z.enum(['Pendente', 'Em andamento', 'Concluída']);

const esquemaDemanda = z.object({
  titulo: z.string().trim().min(3, 'informe o título (mínimo de 3 letras)').max(150),
  categoria: z.string().trim().max(60).default(''),
  prioridade: z.enum(['Alta', 'Média', 'Baixa']),
  responsavelId: texto,
  prazo: dataOpcional,
  bairro: texto,
  grupoId: texto,
  situacao: z.enum(['Aberta', 'Em andamento', 'Concluída']),
  descricao: z.string().trim().max(5000).default(''),
});

const esquemaTarefa = z.object({
  titulo: z.string().trim().min(3, 'informe a tarefa (mínimo de 3 letras)').max(150),
  responsavelId: texto,
  prazo: dataOpcional,
  situacao: situacaoTarefa.default('Pendente'),
});

/** Grava um evento no histórico da demanda. */
function registrar(demandaId: string, titulo: string, detalhe: string) {
  inserir('historicoDemandas', { id: gerarId(), demandaId, titulo, detalhe, data: hojeISO() });
}

const nomeDoUsuario = (id: string) => um<{ nome: string }>('SELECT nome FROM usuarios WHERE id = ?', id)?.nome;

function conferirReferencias(dados: { responsavelId: string; grupoId?: string }) {
  if (dados.responsavelId && !nomeDoUsuario(dados.responsavelId)) throw new ErroHttp(400, 'O responsável escolhido não existe.');
  if (dados.grupoId && !um('SELECT 1 FROM grupos WHERE id = ?', dados.grupoId)) throw new ErroHttp(400, 'O grupo escolhido não existe.');
}

function exigirDemanda(id: string) {
  const demanda = buscarDemanda(id);
  if (!demanda) throw naoEncontrado('Demanda');
  return demanda;
}

demandas.post('/demandas', exigir('demandas', 'criar'), (req, res) => {
  const dados = validar(esquemaDemanda, req.body);
  conferirReferencias(dados);
  const id = gerarId();
  transacao(() => {
    inserir('demandas', {
      ...dados,
      id,
      codigo: proximoCodigo('demandas', 3, 'D-'),
      criadaEm: hojeISO(),
      concluidaEm: dados.situacao === 'Concluída' ? hojeISO() : '',
    });
    registrar(id, 'Demanda criada', usuarioDe(res).nome);
  });
  res.status(201).json(buscarDemanda(id));
});

/** Atualiza a demanda e registra no histórico cada coisa que mudou. */
demandas.put('/demandas/:id', exigir('demandas', 'editar'), (req, res) => {
  const dados = validar(esquemaDemanda, req.body);
  conferirReferencias(dados);
  const quem = usuarioDe(res).nome;
  transacao(() => {
    const anterior = exigirDemanda(req.params.id);
    const eventos: string[] = [];
    if (anterior.situacao !== dados.situacao) eventos.push(`Situação alterada para ${dados.situacao}`);
    if (anterior.prioridade !== dados.prioridade) eventos.push(`Prioridade alterada para ${dados.prioridade}`);
    if (anterior.responsavelId !== dados.responsavelId) {
      eventos.push(`Responsável alterado para ${nomeDoUsuario(dados.responsavelId) ?? 'sem responsável'}`);
    }
    if (anterior.prazo !== dados.prazo) eventos.push(dados.prazo ? `Prazo alterado para ${formatarData(dados.prazo)}` : 'Prazo removido');
    if (eventos.length === 0) eventos.push('Informações atualizadas');

    atualizar('demandas', anterior.id, {
      ...dados,
      concluidaEm: dados.situacao === 'Concluída' ? anterior.concluidaEm || hojeISO() : '',
    });
    // O histórico mostra o mais novo primeiro: grava de trás para frente para manter a ordem da lista.
    for (const titulo of [...eventos].reverse()) registrar(anterior.id, titulo, quem);
    if (anterior.situacao !== dados.situacao) {
      notificar({ tipo: 'demanda', titulo: 'Demanda atualizada', descricao: `Status alterado para ${dados.situacao}`, link: `/demandas/${anterior.id}` });
    }
  });
  res.json(buscarDemanda(req.params.id));
});

// Apagar a demanda também apaga as tarefas e o histórico dela (ON DELETE CASCADE).
demandas.delete('/demandas/:id', exigir('demandas', 'excluir'), (req, res) => {
  if (!executar('DELETE FROM demandas WHERE id = ?', req.params.id)) throw naoEncontrado('Demanda');
  res.status(204).end();
});

// ----------------------------------------------------------------- Tarefas
function exigirTarefa(demandaId: string, tarefaId: string) {
  const tarefa = exigirDemanda(demandaId).tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) throw naoEncontrado('Tarefa');
  return tarefa;
}

const tituloDaMudanca = (situacao: SituacaoTarefa) =>
  situacao === 'Concluída' ? 'Tarefa concluída' : situacao === 'Em andamento' ? 'Tarefa iniciada' : 'Tarefa reaberta';

demandas.post('/demandas/:id/tarefas', exigir('demandas', 'editar'), (req, res) => {
  const dados = validar(esquemaTarefa, req.body);
  conferirReferencias(dados);
  transacao(() => {
    exigirDemanda(req.params.id);
    inserir('tarefas', { ...dados, id: gerarId(), demandaId: req.params.id });
    registrar(req.params.id, 'Tarefa criada', dados.titulo);
  });
  res.status(201).json(buscarDemanda(req.params.id));
});

demandas.put('/demandas/:id/tarefas/:tarefaId', exigir('demandas', 'editar'), (req, res) => {
  const dados = validar(esquemaTarefa, req.body);
  conferirReferencias(dados);
  transacao(() => {
    exigirTarefa(req.params.id, req.params.tarefaId);
    atualizar('tarefas', req.params.tarefaId, dados);
    registrar(req.params.id, 'Tarefa atualizada', dados.titulo);
  });
  res.json(buscarDemanda(req.params.id));
});

/** Muda a situação da tarefa; sem "situacao" no corpo, alterna entre concluída e pendente. */
demandas.patch('/demandas/:id/tarefas/:tarefaId/situacao', exigir('demandas', 'editar'), (req, res) => {
  const { situacao } = validar(z.object({ situacao: situacaoTarefa.optional() }), req.body ?? {});
  transacao(() => {
    const tarefa: Tarefa = exigirTarefa(req.params.id, req.params.tarefaId);
    const nova = situacao ?? (tarefa.situacao === 'Concluída' ? 'Pendente' : 'Concluída');
    if (nova === tarefa.situacao) return;
    atualizar('tarefas', tarefa.id, { situacao: nova });
    registrar(req.params.id, tituloDaMudanca(nova), tarefa.titulo);
  });
  res.json(buscarDemanda(req.params.id));
});

demandas.delete('/demandas/:id/tarefas/:tarefaId', exigir('demandas', 'editar'), (req, res) => {
  transacao(() => {
    const tarefa = exigirTarefa(req.params.id, req.params.tarefaId);
    executar('DELETE FROM tarefas WHERE id = ?', tarefa.id);
    registrar(req.params.id, 'Tarefa removida', tarefa.titulo);
  });
  res.json(buscarDemanda(req.params.id));
});
