// Monta o servidor (sem ligar): a API em /api e, depois do build, as telas da pasta dist.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import { api, tratarErros } from './rotas/index.ts';

export const app = express();
app.disable('x-powered-by');
app.use('/api', api);

// Em produção (npm start), o próprio servidor entrega as telas já compiladas.
const telas = join(import.meta.dirname, '..', 'dist');
if (existsSync(join(telas, 'index.html'))) {
  app.use(express.static(telas));
  app.get('/{*caminho}', (_req, res) => res.sendFile(join(telas, 'index.html')));
}

app.use(tratarErros);
