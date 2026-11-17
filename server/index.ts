// Liga o servidor do SESFA.
import { app } from './app.ts';
import { criarPerfisPadrao } from './perfis.ts';

if (criarPerfisPadrao()) {
  console.log('Banco novo: perfis de acesso criados. Abra o sistema para cadastrar o administrador.');
}

// Variável própria (e não PORT) para não brigar com a porta do Vite em desenvolvimento.
const porta = Number(process.env.SESFA_PORTA ?? 3333);
app.listen(porta, () => {
  console.log(`API do SESFA rodando em http://localhost:${porta}/api`);
});
