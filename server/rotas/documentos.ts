// Documentos (arquivos enviados) e histórico de relatórios gerados.
import { createReadStream, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { exigir, usuarioDe } from '../auth.ts';
import { executar, inserir, PASTA_ARQUIVOS } from '../banco.ts';
import { buscarDocumento, listarRelatorios } from '../consultas.ts';
import { agoraISO, ErroHttp, gerarId, hojeISO, naoEncontrado, validar } from '../util.ts';

export const documentos = Router();

export const TAMANHO_MAXIMO = 20 * 1024 * 1024; // 20 MB

const TIPOS = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

// Assinatura dos primeiros bytes: PDF começa com "%PDF"; DOCX e XLSX são arquivos ZIP ("PK").
const assinaturaConfere = (tipo: keyof typeof TIPOS, bytes: Buffer) =>
  tipo === 'PDF' ? bytes.subarray(0, 4).toString('latin1') === '%PDF' : bytes.subarray(0, 2).toString('latin1') === 'PK';

const esquemaDocumento = z.object({
  nome: z.string().trim().min(1, 'informe o nome do documento').max(150),
  tipo: z.enum(['PDF', 'DOCX', 'XLSX']),
  vinculo: z.object({
    tipo: z.enum(['modulo', 'grupo', 'atividade', 'demanda']),
    id: z.string().min(1),
    rotulo: z.string().min(1).max(150),
  }),
  /** Conteúdo do arquivo em base64. */
  conteudo: z.string().min(1, 'o arquivo está vazio'),
});

const arquivoDe = (id: string) => join(PASTA_ARQUIVOS, id);

// O arquivo chega em base64 dentro do JSON (o limite maior desta rota está em rotas/index.ts).
documentos.post('/documentos', exigir('relatorios', 'criar'), (req, res) => {
  const { conteudo, vinculo, ...dados } = validar(esquemaDocumento, req.body);
  const bytes = Buffer.from(conteudo, 'base64');
  if (bytes.length > TAMANHO_MAXIMO) throw new ErroHttp(413, 'O arquivo passa de 20 MB.');
  if (!assinaturaConfere(dados.tipo, bytes)) throw new ErroHttp(400, `O conteúdo não parece ser um arquivo ${dados.tipo} válido.`);

  const id = gerarId();
  writeFileSync(arquivoDe(id), bytes);
  try {
    inserir('documentos', {
      ...dados,
      id,
      vinculoTipo: vinculo.tipo,
      vinculoId: vinculo.id,
      vinculoRotulo: vinculo.rotulo,
      enviadoPor: usuarioDe(res).nome,
      data: hojeISO(),
      tamanho: bytes.length,
      temArquivo: 1,
    });
  } catch (erro) {
    rmSync(arquivoDe(id), { force: true });
    throw erro;
  }
  res.status(201).json(buscarDocumento(id));
});

documentos.get('/documentos/:id/arquivo', exigir('relatorios'), (req, res) => {
  const documento = buscarDocumento(req.params.id);
  if (!documento) throw naoEncontrado('Documento');
  if (!documento.temArquivo || !existsSync(arquivoDe(documento.id))) {
    throw new ErroHttp(404, 'O arquivo deste documento não foi encontrado no servidor.');
  }
  res.setHeader('Content-Type', TIPOS[documento.tipo]);
  res.setHeader('Content-Length', String(documento.tamanho));
  createReadStream(arquivoDe(documento.id)).pipe(res);
});

documentos.delete('/documentos/:id', exigir('relatorios', 'excluir'), (req, res) => {
  if (!executar('DELETE FROM documentos WHERE id = ?', req.params.id)) throw naoEncontrado('Documento');
  rmSync(arquivoDe(req.params.id), { force: true });
  res.status(204).end();
});

// ---------------------------------------------------------------- Relatórios
// O PDF/Excel é montado no navegador; aqui fica só o registro de quem gerou e quando.
documentos.post('/relatorios', exigir('relatorios'), (req, res) => {
  const dados = validar(
    z.object({
      tipo: z.enum(['membros', 'atividades', 'inscricoes', 'demandas']),
      periodo: z.string().regex(/^\d{4}-\d{2}$/, 'use o formato aaaa-mm'),
      formato: z.enum(['PDF', 'XLSX']),
    }),
    req.body,
  );
  const relatorio = { ...dados, id: gerarId(), geradoPor: usuarioDe(res).nome, geradoEm: agoraISO() };
  inserir('relatorios', relatorio);
  res.status(201).json(listarRelatorios().find((r) => r.id === relatorio.id));
});
