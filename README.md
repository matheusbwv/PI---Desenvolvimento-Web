# SESFA · Gestão de Comunidade

Sistema web para gestão de comunidades: membros, grupos, agenda de atividades, inscrições e presença, comunicados, demandas, relatórios e controle de acesso por perfil.

Projeto Integrador (PI) de **Desenvolvimento Web**, feito a partir do protótipo no Figma:

- **Front-end:** React + TypeScript (pasta `src/`)
- **Back-end:** API REST em Node.js + Express, com banco de dados SQLite, senhas criptografadas (bcrypt) e login por token (JWT) (pasta `server/`)

## Como rodar

Você precisa do [Node.js](https://nodejs.org) **22.18 ou mais novo** (a versão 24 ou mais nova é a recomendada). O banco de dados (SQLite) já vem dentro do Node, então não é preciso instalar mais nada.

No terminal, dentro da pasta do projeto:

```bash
npm install
npm run dev
```

Depois abra <http://localhost:5173>. O `npm run dev` liga duas coisas ao mesmo tempo: a API (porta 3333) e as telas (porta 5173), que repassam as chamadas `/api` para a API.

## Primeiro acesso

Na primeira vez que a API roda, ela cria o banco em `server/dados/sesfa.db` **vazio**: só com os quatro perfis de acesso (Administrador, Coordenador, Operador e Consulta). Membros, grupos, atividades, demandas, comunicados e documentos são todos cadastrados pelas telas.

Com o banco sem nenhum usuário, a tela de login vira **Primeiro acesso**: quem abrir o sistema primeiro cadastra a conta do administrador (nome, e-mail e senha). Depois disso, o administrador cria as contas das outras pessoas em **Administração › Usuários**, cada uma com a própria senha inicial. As permissões de cada perfil podem ser ajustadas em **Administração › Perfis e permissões**.

Também dá para entrar só com a parte do e-mail antes do @. Para começar tudo de novo, desligue o servidor e apague a pasta `server/dados`.

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm test` | Roda os testes da API em um banco temporário, que é apagado no fim (não mexe no banco do sistema) |
| `npm run build` | Confere os tipos do front-end e do servidor e gera as telas na pasta `dist/` |
| `npm start` | Liga só o servidor, que entrega a API e as telas do `build` em <http://localhost:3333> |
| `npm run typecheck` | Só confere os tipos do TypeScript |

### Perfis padrão

| Perfil | O que pode fazer |
|---|---|
| Administrador | Tudo, inclusive usuários e permissões (não pode ser alterado) |
| Coordenador | Gerencia membros, grupos, atividades, inscrições, comunicados e demandas; vê os relatórios |
| Operador | Cadastra e edita membros e inscrições, abre demandas e vê grupos, atividades e comunicados (não vê relatórios) |
| Consulta | Só visualiza (não vê a administração) |

## Telas

| Módulo | Telas |
|---|---|
| Acesso | Login com validação, "lembrar de mim" e controle de sessão |
| Início | Painel com indicadores, próximas atividades e notificações recentes |
| Membros | Lista com busca, filtros e paginação; cadastro e edição com máscara de telefone |
| Grupos | Lista, cadastro e detalhes com abas (descrição, membros, atividades e documentos) |
| Atividades | Agenda mensal (ou em lista), cadastro e detalhes com inscritos, lista de espera e presença |
| Inscrições | Inscrições confirmadas, lista de espera (com promoção quando abre vaga) e canceladas |
| Comunicados | Lista com abas e filtros, criação com rascunho/publicação e notificações |
| Demandas | Painel por situação, filtros, cadastro e detalhes com tarefas, progresso e histórico |
| Relatórios | Indicadores com gráficos, geração de relatórios em **PDF** e **Excel** e documentos |
| Administração | Contas de usuário e matriz de permissões por perfil |

Telas que não estavam no Figma (cadastro e detalhes de atividade, inscrições e presença) foram criadas seguindo o mesmo padrão visual.

## Back-end

### Segurança
- **Senhas:** guardadas com bcrypt (no banco fica só o hash, nunca a senha). O login devolve um token JWT, que vale 12 horas (ou 30 dias com "Lembrar de mim").
- **Primeiro acesso:** a rota que cria o administrador só funciona enquanto o banco não tem nenhum usuário.
- **Token:** toda rota da API, menos o login, exige o token.
- **Permissões:** o servidor confere a permissão do perfil em cada ação. As telas só escondem os botões, mas quem bloqueia de verdade é a API (resposta 403).
- **Validação:** todos os dados recebidos são validados com Zod antes de chegar ao banco.
- **Proteção da própria conta:** ninguém consegue desativar ou excluir a própria conta, nem mudar o próprio perfil. O perfil Administrador não pode perder acesso.

### Regras de negócio no servidor
- **Inscrições:** respeitam o número de vagas. Sem vaga, o membro vai para a lista de espera; quando alguém cancela, todos recebem o aviso "vaga liberada". Não é possível inscrever o mesmo membro duas vezes, membros inativos nem em atividades canceladas ou concluídas.
- **Vagas:** não dá para reduzir as vagas de uma atividade abaixo do número de inscrições já confirmadas.
- **Demandas:** cada alteração (situação, prioridade, responsável, prazo, tarefas) fica registrada no histórico.
- **Códigos:** membros (`001`, `002`...), grupos (`01`...) e demandas (`D-001`...) recebem código sequencial.
- **Exclusões:** apagar um membro, atividade ou demanda também apaga o que depende dele (inscrições, tarefas, histórico). Apagar um grupo mantém as atividades e demandas, só que sem grupo.
- **Notificações:** cada usuário marca as próprias notificações como lidas.
- **Documentos:** o arquivo é guardado em `server/dados/arquivos` e conferido pelo conteúdo (um "PDF" precisa ser mesmo um PDF). O limite é de 20 MB.

### Banco de dados
O banco usa SQLite, com 16 tabelas relacionadas por chaves estrangeiras. O esquema completo está em [`server/esquema.sql`](server/esquema.sql).

### Rotas da API
Todas as rotas começam com `/api`.

| Método e rota | O que faz |
|---|---|
| `GET /auth/situacao` | Diz se o banco ainda precisa do primeiro administrador |
| `POST /auth/primeiro-acesso` | Cadastra o primeiro administrador (só com o banco sem usuários) |
| `POST /auth/entrar` | Login (devolve o token) |
| `GET /auth/eu` | Usuário logado |
| `GET /dados` | Todos os dados que as telas usam |
| `POST /membros` · `PUT /membros/:id` · `PATCH /membros/:id/situacao` · `DELETE /membros/:id` | Membros |
| `POST /grupos` · `PUT /grupos/:id` · `PATCH /grupos/:id/situacao` · `DELETE /grupos/:id` | Grupos |
| `POST /grupos/:id/membros` · `DELETE /grupos/:id/membros/:membroId` | Membros do grupo |
| `POST /atividades` · `PUT /atividades/:id` · `DELETE /atividades/:id` | Atividades |
| `POST /inscricoes` · `POST /inscricoes/:id/cancelar` · `POST /inscricoes/:id/promover` | Inscrições e lista de espera |
| `PATCH /inscricoes/:id/presenca` · `POST /atividades/:id/presenca` | Presença |
| `POST /comunicados` · `PUT /comunicados/:id` · `POST /comunicados/:id/publicar` · `DELETE /comunicados/:id` | Comunicados |
| `POST /notificacoes/:id/lida` · `POST /notificacoes/lidas` | Notificações lidas |
| `POST /demandas` · `PUT /demandas/:id` · `DELETE /demandas/:id` | Demandas |
| `POST /demandas/:id/tarefas` · `PUT` · `PATCH .../situacao` · `DELETE /demandas/:id/tarefas/:tarefaId` | Tarefas |
| `POST /documentos` · `GET /documentos/:id/arquivo` · `DELETE /documentos/:id` | Documentos |
| `POST /relatorios` | Registro dos relatórios gerados |
| `POST /usuarios` · `PUT /usuarios/:id` · `PATCH /usuarios/:id/situacao` · `DELETE /usuarios/:id` | Usuários |
| `PUT /perfis` | Permissões dos perfis |

Os erros voltam como `{ "erro": "mensagem" }`, com o código HTTP certo: 400 para dados inválidos, 401 sem login, 403 sem permissão, 404 quando não encontra e 409 quando uma regra impede a ação.

### Configuração (opcional)

| Variável | Para que serve | Padrão |
|---|---|---|
| `SESFA_PORTA` | Porta da API | `3333` |
| `SESFA_DADOS` | Pasta do banco e dos arquivos | `server/dados` |
| `SESFA_SEGREDO` | Segredo que assina os tokens | Gerado na primeira vez e guardado em `server/dados/segredo.txt` |

## Tecnologias

- **Telas:**
  - [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Vite](https://vite.dev)
  - [Tailwind CSS 4](https://tailwindcss.com), com as cores e fontes extraídas do Figma
  - [React Router](https://reactrouter.com) para as rotas
  - [Zustand](https://zustand.docs.pmnd.rs) para guardar os dados da API em memória
  - [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) para os formulários
  - [Radix UI](https://www.radix-ui.com) para menus e janelas
  - [Recharts](https://recharts.org) para os gráficos
  - [jsPDF](https://github.com/parallax/jsPDF) + [write-excel-file](https://www.npmjs.com/package/write-excel-file) para exportar em PDF e Excel
  - [Lucide](https://lucide.dev) para os ícones e [date-fns](https://date-fns.org) para as datas
- **Servidor:**
  - [Node.js](https://nodejs.org), que roda o TypeScript direto
  - [Express 5](https://expressjs.com) para a API
  - SQLite (`node:sqlite`) como banco de dados
  - [bcryptjs](https://www.npmjs.com/package/bcryptjs) para as senhas e [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) para os tokens
  - [Zod](https://zod.dev) para validar os dados
  - `node:test` para os testes automáticos

## Estrutura

```
server/
├── index.ts           Liga o servidor
├── app.ts             Monta a API (e entrega as telas depois do build)
├── esquema.sql        Tabelas do banco de dados
├── banco.ts           Conexão com o SQLite e funções de consulta
├── consultas.ts       Leitura dos dados no formato das telas
├── auth.ts            Login, senhas, tokens e permissões
├── perfis.ts          Perfis de acesso criados quando o banco é novo
├── rotas/             Rotas da API, uma por área do sistema
└── api.test.ts        Testes automáticos da API
src/
├── components/
│   ├── layout/        Menu lateral, cabeçalho, busca global e estrutura das páginas
│   ├── ui/            Botões, campos, tabelas, selos, abas, menus e janelas
│   └── Graficos.tsx   Gráficos de barras e de rosca
├── lib/               Chamadas à API, formatação, regras de exibição e relatórios
├── pages/             Uma pasta por módulo do sistema
├── store/             Dados vindos da API, sessão e permissões
└── types.ts           Modelos de dados (usados pelas telas e pelo servidor)
```

## Observações

- **Cores dos gráficos:** a ordem das cores da rosca foi ajustada (azul, verde, roxo, laranja) para ficar legível também para pessoas com daltonismo. No Figma, azul e roxo ficavam lado a lado.
