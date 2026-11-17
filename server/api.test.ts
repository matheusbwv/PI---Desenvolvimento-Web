// Testes da API. Rodam em um banco temporário, que é apagado no fim (não mexem no banco do sistema): npm test
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import type { Atividade, Dados, Demanda, Documento, Inscricao, Membro, Perfil, Usuario } from '../src/types.ts';

const pasta = mkdtempSync(join(tmpdir(), 'sesfa-teste-'));
process.env.SESFA_DADOS = pasta;
const { app } = await import('./app.ts');
const { criarPerfisPadrao } = await import('./perfis.ts');
const { banco } = await import('./banco.ts');

let servidor: Server;
let base = '';

before(async () => {
  criarPerfisPadrao();
  servidor = app.listen(0);
  await new Promise((pronto) => servidor.once('listening', pronto));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}/api`;
});

after(() => {
  servidor.close();
  banco.close();
  rmSync(pasta, { recursive: true, force: true });
});

interface Resposta<T> {
  status: number;
  corpo: T & { erro?: string };
}

async function chamar<T = unknown>(metodo: string, caminho: string, token?: string, corpo?: unknown): Promise<Resposta<T>> {
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  return { status: resposta.status, corpo: texto ? JSON.parse(texto) : ({} as T) };
}

async function entrar(login: string, senha: string): Promise<string> {
  const r = await chamar<{ token: string }>('POST', '/auth/entrar', undefined, { login, senha, lembrar: false });
  assert.equal(r.status, 200, r.corpo.erro ?? '');
  return r.corpo.token;
}

const dados = async (token: string) => (await chamar<Dados>('GET', '/dados', token)).corpo;

// Contas criadas durante os testes.
const ADM = { nome: 'Administradora Teste', email: 'adm@teste.org', senha: 'senha-adm' };
const contas = {
  coord: { nome: 'Coordenação Teste', email: 'coord@teste.org', perfilId: 'p-coord', situacao: 'Ativo', senha: 'senha-coord' },
  oper: { nome: 'Operação Teste', email: 'oper@teste.org', perfilId: 'p-oper', situacao: 'Ativo', senha: 'senha-oper' },
  cons: { nome: 'Consulta Teste', email: 'cons@teste.org', perfilId: 'p-cons', situacao: 'Ativo', senha: 'senha-cons' },
  inativo: { nome: 'Pessoa Inativa', email: 'inativa@teste.org', perfilId: 'p-cons', situacao: 'Inativo', senha: 'senha-inativa' },
};
let adm = '';
let admId = '';

describe('primeiro acesso', () => {
  test('o banco começa vazio e a primeira pessoa cadastra o administrador', async () => {
    assert.deepEqual((await chamar('GET', '/auth/situacao')).corpo, { primeiroAcesso: true });
    assert.equal((await chamar('POST', '/auth/primeiro-acesso', undefined, { ...ADM, senha: '123' })).status, 400, 'senha curta');

    const criado = await chamar<{ token: string; usuario: Usuario }>('POST', '/auth/primeiro-acesso', undefined, ADM);
    assert.equal(criado.status, 201);
    assert.equal(criado.corpo.usuario.perfilId, 'p-admin');
    adm = criado.corpo.token;
    admId = criado.corpo.usuario.id;

    assert.deepEqual((await chamar('GET', '/auth/situacao')).corpo, { primeiroAcesso: false });
    assert.equal((await chamar('POST', '/auth/primeiro-acesso', undefined, { ...ADM, email: 'outro@teste.org' })).status, 409, 'só uma vez');

    const d = await dados(adm);
    assert.equal(d.membros.length + d.grupos.length + d.atividades.length + d.demandas.length + d.comunicados.length, 0);
    assert.equal(d.perfis.length, 4);
  });

  test('o administrador cria as contas das outras pessoas', async () => {
    for (const conta of Object.values(contas)) {
      assert.equal((await chamar('POST', '/usuarios', adm, conta)).status, 201, conta.email);
    }
  });
});

describe('login', () => {
  test('recusa senha errada, usuário inativo e pedido sem token', async () => {
    assert.equal((await chamar('POST', '/auth/entrar', undefined, { login: ADM.email, senha: 'errada' })).status, 401);
    const inativo = await chamar('POST', '/auth/entrar', undefined, { login: contas.inativo.email, senha: contas.inativo.senha });
    assert.equal(inativo.status, 403);
    assert.match(inativo.corpo.erro ?? '', /inativo/);
    assert.equal((await chamar('GET', '/dados')).status, 401);
    assert.equal((await chamar('GET', '/dados', 'token-falso')).status, 401);
  });

  test('aceita o e-mail completo ou só o usuário e nunca devolve a senha', async () => {
    const r = await chamar<{ token: string; usuario: Usuario }>('POST', '/auth/entrar', undefined, { login: 'COORD', senha: contas.coord.senha });
    assert.equal(r.status, 200);
    assert.equal(r.corpo.usuario.email, contas.coord.email);
    assert.ok(!('senhaHash' in r.corpo.usuario));
  });
});

describe('dados e permissões', () => {
  test('quem não é da administração não vê e-mail de outros usuários', async () => {
    assert.ok((await dados(adm)).usuarios.every((u) => u.email));
    const consulta = await dados(await entrar(contas.cons.email, contas.cons.senha));
    assert.deepEqual(consulta.usuarios.filter((u) => u.email).map((u) => u.email), [contas.cons.email]);
  });

  test('o servidor bloqueia o que o perfil não pode fazer', async () => {
    const consulta = await entrar(contas.cons.email, contas.cons.senha);
    const operador = await entrar(contas.oper.email, contas.oper.senha);
    const membro = { nome: 'Pessoa de Teste', telefone: '(88) 99999-0000' };
    assert.equal((await chamar('POST', '/membros', consulta, membro)).status, 403);
    const criado = await chamar<Membro>('POST', '/membros', operador, membro);
    assert.equal(criado.status, 201);
    assert.equal(criado.corpo.codigo, '001');
    assert.equal(criado.corpo.situacao, 'Ativo');
    assert.equal((await chamar('DELETE', `/membros/${criado.corpo.id}`, operador)).status, 403);
    assert.equal((await chamar('POST', '/usuarios', operador, {})).status, 403);
    assert.equal((await dados(operador)).documentos.length, 0, 'Operador não vê o módulo Relatórios');
  });

  test('valida os campos e devolve a mensagem do erro', async () => {
    const r = await chamar('POST', '/membros', adm, { nome: 'ab', email: 'sem-arroba' });
    assert.equal(r.status, 400);
    assert.match(r.corpo.erro ?? '', /nome/);
    assert.equal((await chamar('PUT', '/membros/nao-existe', adm, { nome: 'Fulano de Tal' })).status, 404);
  });
});

describe('inscrições', () => {
  test('vagas, lista de espera, cancelamento e promoção', async () => {
    const membros: Membro[] = [];
    for (const nome of ['Ana Teste', 'Bruno Teste', 'Carla Teste', 'Davi Teste']) {
      membros.push((await chamar<Membro>('POST', '/membros', adm, { nome })).corpo);
    }
    const inativo = (await chamar<Membro>('POST', '/membros', adm, { nome: 'Edu Inativo', situacao: 'Inativo' })).corpo;
    const atividade = await chamar<Atividade>('POST', '/atividades', adm, {
      titulo: 'Atividade de teste', tipo: 'Evento comunitário', grupoId: '', data: '2030-01-10',
      horaInicio: '14:00', horaFim: '16:00', local: 'Sede', vagas: 2, situacao: 'Inscrições abertas', descricao: '',
    });
    assert.equal(atividade.status, 201);
    const id = atividade.corpo.id;
    const inscrever = (membroId: string) => chamar<{ inscricao: Inscricao; mensagem: string }>('POST', '/inscricoes', adm, { atividadeId: id, membroId });

    const [a, b, c] = [await inscrever(membros[0].id), await inscrever(membros[1].id), await inscrever(membros[2].id)];
    assert.deepEqual([a, b, c].map((r) => r.corpo.inscricao.situacao), ['Confirmada', 'Confirmada', 'Lista de espera']);
    assert.equal((await inscrever(membros[0].id)).status, 409, 'inscrição repetida');
    assert.equal((await inscrever(inativo.id)).status, 409, 'membro inativo');

    assert.equal((await chamar('POST', `/inscricoes/${c.corpo.inscricao.id}/promover`, adm)).status, 409, 'sem vaga');
    const reduzir = await chamar('PUT', `/atividades/${id}`, adm, { ...atividade.corpo, vagas: 1 });
    assert.equal(reduzir.status, 400, 'não reduz vagas abaixo das confirmadas');

    await chamar('POST', `/inscricoes/${a.corpo.inscricao.id}/cancelar`, adm);
    assert.equal((await dados(adm)).notificacoes[0].titulo, 'Vaga liberada na Atividade de teste');
    const promovida = await chamar<{ inscricao: Inscricao }>('POST', `/inscricoes/${c.corpo.inscricao.id}/promover`, adm);
    assert.equal(promovida.corpo.inscricao.situacao, 'Confirmada');

    const presenca = await chamar<Inscricao>('PATCH', `/inscricoes/${b.corpo.inscricao.id}/presenca`, adm, { presente: true });
    assert.equal(presenca.corpo.presente, true);

    await chamar('PUT', `/atividades/${id}`, adm, { ...atividade.corpo, situacao: 'Cancelada' });
    assert.equal((await inscrever(membros[3].id)).status, 409, 'atividade cancelada');
    assert.equal((await chamar('DELETE', `/atividades/${id}`, adm)).status, 204);
    assert.equal((await dados(adm)).inscricoes.filter((i) => i.atividadeId === id).length, 0, 'inscrições apagadas junto');
  });
});

describe('demandas', () => {
  test('código, tarefas, histórico e conclusão', async () => {
    const coord = (await dados(adm)).usuarios.find((u) => u.email === contas.coord.email)!;
    const criada = await chamar<Demanda>('POST', '/demandas', adm, {
      titulo: 'Demanda de teste', categoria: 'Infraestrutura', prioridade: 'Média', responsavelId: coord.id,
      prazo: '2030-01-01', bairro: 'Centro', grupoId: '', situacao: 'Aberta', descricao: '',
    });
    assert.equal(criada.status, 201);
    assert.equal(criada.corpo.codigo, 'D-001');
    const id = criada.corpo.id;
    await chamar<Demanda>('POST', `/demandas/${id}/tarefas`, adm, { titulo: 'Primeira tarefa' });
    let demanda = (await chamar<Demanda>('POST', `/demandas/${id}/tarefas`, adm, { titulo: 'Segunda tarefa' })).corpo;
    demanda = (await chamar<Demanda>('PATCH', `/demandas/${id}/tarefas/${demanda.tarefas[0].id}/situacao`, adm, {})).corpo;
    assert.deepEqual(demanda.tarefas.map((t) => t.situacao), ['Concluída', 'Pendente']);

    const { id: _, codigo: _c, tarefas: _t, historico: _h, criadaEm: _cr, concluidaEm: _co, ...campos } = demanda;
    demanda = (await chamar<Demanda>('PUT', `/demandas/${id}`, adm, { ...campos, situacao: 'Concluída', prioridade: 'Alta' })).corpo;
    assert.ok(demanda.concluidaEm);
    assert.deepEqual(demanda.historico.slice(0, 3).map((h) => h.titulo), [
      'Situação alterada para Concluída',
      'Prioridade alterada para Alta',
      'Tarefa concluída',
    ]);
    assert.equal((await dados(adm)).notificacoes[0].descricao, 'Status alterado para Concluída');
    assert.equal((await chamar('DELETE', `/demandas/${id}`, adm)).status, 204);
    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM tarefas WHERE demandaId = ?').get(id)?.n, 0);
  });
});

describe('comunicados e notificações', () => {
  test('rascunho, publicação e leitura por usuário', async () => {
    const consulta = await entrar(contas.cons.email, contas.cons.senha);
    const rascunho = await chamar<{ id: string; situacao: string }>('POST', '/comunicados', adm, {
      titulo: 'Comunicado de teste', categoria: 'Aviso', publico: 'Todos os membros', mensagem: 'Texto', situacao: 'Rascunho',
    });
    assert.equal(rascunho.corpo.situacao, 'Rascunho');
    const publicado = await chamar<{ situacao: string; dataPublicacao: string }>('POST', `/comunicados/${rascunho.corpo.id}/publicar`, adm);
    assert.equal(publicado.corpo.situacao, 'Publicado');
    assert.ok(publicado.corpo.dataPublicacao);

    await chamar('POST', '/notificacoes/lidas', adm);
    assert.ok((await dados(adm)).notificacoes.every((n) => n.lida));
    assert.ok((await dados(consulta)).notificacoes.some((n) => !n.lida), 'cada usuário tem a própria leitura');
  });
});

describe('documentos', () => {
  test('envia, baixa e apaga o arquivo; recusa conteúdo que não bate com o tipo', async () => {
    const conteudo = Buffer.from('%PDF-1.4 arquivo de teste').toString('base64');
    const vinculo = { tipo: 'modulo', id: 'membros', rotulo: 'Membros' };
    const errado = await chamar('POST', '/documentos', adm, { nome: 'Falso', tipo: 'PDF', vinculo, conteudo: Buffer.from('oi').toString('base64') });
    assert.equal(errado.status, 400);

    const enviado = await chamar<Documento>('POST', '/documentos', adm, { nome: 'Ata de teste', tipo: 'PDF', vinculo, conteudo });
    assert.equal(enviado.status, 201);
    assert.equal(enviado.corpo.enviadoPor, ADM.nome);
    const arquivo = await fetch(`${base}/documentos/${enviado.corpo.id}/arquivo`, { headers: { Authorization: `Bearer ${adm}` } });
    assert.equal(arquivo.headers.get('content-type'), 'application/pdf');
    assert.equal(await arquivo.text(), '%PDF-1.4 arquivo de teste');

    assert.equal((await chamar('DELETE', `/documentos/${enviado.corpo.id}`, adm)).status, 204);
    assert.equal((await chamar('GET', `/documentos/${enviado.corpo.id}/arquivo`, adm)).status, 404);
  });
});

describe('administração', () => {
  test('senha própria por usuário e proteção da conta de quem está logado', async () => {
    const novo = { nome: 'Nova Pessoa', email: 'nova.pessoa@teste.org', perfilId: 'p-oper', situacao: 'Ativo', senha: 'senha-forte' };
    assert.equal((await chamar('POST', '/usuarios', adm, { ...novo, senha: '' })).status, 400, 'senha obrigatória');
    const criado = await chamar<Usuario>('POST', '/usuarios', adm, novo);
    assert.equal(criado.status, 201);
    assert.equal((await chamar('POST', '/usuarios', adm, novo)).status, 409, 'e-mail repetido');
    const tokenNovo = await entrar('nova.pessoa', 'senha-forte');

    assert.equal((await chamar('PATCH', `/usuarios/${admId}/situacao`, adm)).status, 409, 'não desativa a si mesmo');
    assert.equal((await chamar('DELETE', `/usuarios/${admId}`, adm)).status, 409, 'não exclui a si mesmo');
    assert.equal((await chamar('DELETE', `/usuarios/${criado.corpo.id}`, adm)).status, 204);
    assert.equal((await chamar('GET', '/dados', tokenNovo)).status, 401, 'token de usuário excluído deixa de valer');
  });

  test('perfis: muda permissões, mas o Administrador continua com acesso total', async () => {
    const perfis = (await dados(adm)).perfis;
    const alterados: Perfil[] = perfis.map((p) => ({
      ...p,
      permissoes: Object.fromEntries(
        Object.entries(p.permissoes).map(([m, linha]) => [
          m,
          p.id === 'p-cons' && m === 'membros' ? { ...linha, criar: true } : p.id === 'p-admin' ? { ...linha, excluir: false } : linha,
        ]),
      ) as Perfil['permissoes'],
    }));
    const r = await chamar<Perfil[]>('PUT', '/perfis', adm, alterados);
    assert.equal(r.status, 200);
    assert.equal(r.corpo.find((p) => p.id === 'p-admin')!.permissoes.membros.excluir, true);
    const consulta = await entrar(contas.cons.email, contas.cons.senha);
    assert.equal((await chamar('POST', '/membros', consulta, { nome: 'Cadastro pela Consulta' })).status, 201);
  });
});
