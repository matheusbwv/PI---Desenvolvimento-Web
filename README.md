# SESFA · Gestão de Comunidade

Sistema web para gestão de comunidades: membros, grupos, agenda de atividades, inscrições e presença, comunicados, demandas, relatórios e controle de acesso por perfil.

Projeto Integrador (PI) de **Desenvolvimento Web**, feito em **React + TypeScript** a partir do protótipo no Figma (as telas estão em [`docs/figma`](docs/figma)).

## Como rodar

Você precisa do [Node.js](https://nodejs.org) (versão 22 ou mais nova).

**No Windows, o jeito mais fácil:** dê dois cliques em `iniciar.bat`. Na primeira vez ele instala as dependências; depois abre o sistema no navegador.

**Pelo terminal:**

```bash
npm install
npm run dev
```

Depois abra <http://localhost:5173>.

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run build` | Confere os tipos e gera a versão final na pasta `dist/` |
| `npm run preview` | Abre a versão final gerada pelo `build` |
| `npm run typecheck` | Só confere os tipos do TypeScript |

## Acesso de demonstração

O sistema ainda não tem servidor: o login e os dados funcionam no próprio navegador. Todos os usuários abaixo usam a senha **`sesfa123`**.

| Usuário | Perfil | O que pode fazer |
|---|---|---|
| `adm@sesfa.org` | Administrador | Tudo, inclusive usuários e permissões |
| `ana.silva@sesfa.org` | Coordenador | Gerencia grupos, atividades e demandas |
| `joao.pereira@sesfa.org` | Operador | Cadastros e presença |
| `paulo.henrique@sesfa.org` | Consulta | Somente leitura |

Também dá para entrar só com o usuário (ex.: `adm`). Os menus e botões mudam conforme as permissões do perfil, que podem ser editadas em **Administração › Perfis e permissões**.

Os cadastros ficam salvos no navegador (localStorage, e os arquivos enviados em IndexedDB). Para voltar aos dados de exemplo, clique no seu nome no canto superior direito e escolha **Restaurar dados de exemplo**.

## Telas

| Módulo | Telas |
|---|---|
| Acesso | Login com validação, "lembrar de mim" e controle de sessão |
| Início | Painel com indicadores, próximas atividades e notificações recentes |
| Membros | Lista com busca, filtros e paginação; cadastro e edição com máscara de telefone |
| Grupos | Lista, cadastro e detalhes com abas (descrição, membros, atividades e documentos) |
| Atividades | Agenda mensal (ou em lista), cadastro e detalhes com inscritos, lista de espera e presença |
| Inscrições | Inscrições confirmadas, lista de espera (com promoção automática de vaga) e canceladas |
| Comunicados | Lista com abas e filtros, criação com rascunho/publicação e notificações |
| Demandas | Painel por situação, filtros, cadastro e detalhes com tarefas, progresso e histórico |
| Relatórios | Indicadores com gráficos, geração de relatórios em **PDF** e **Excel** e documentos |
| Administração | Contas de usuário e matriz de permissões por perfil |

Telas que não estavam no Figma (cadastro e detalhes de atividade, inscrições e presença) foram criadas seguindo o mesmo padrão visual.

## Tecnologias

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Vite](https://vite.dev)
- [Tailwind CSS 4](https://tailwindcss.com): estilos, com as cores e fontes extraídas do Figma
- [React Router](https://reactrouter.com): rotas e proteção das páginas por login e permissão
- [Zustand](https://zustand.docs.pmnd.rs): estado global salvo no navegador
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev): formulários e validação
- [Radix UI](https://www.radix-ui.com): menus, janelas e confirmações acessíveis
- [Recharts](https://recharts.org): gráficos dos indicadores
- [jsPDF](https://github.com/parallax/jsPDF) + [write-excel-file](https://www.npmjs.com/package/write-excel-file): exportação em PDF e Excel
- [Lucide](https://lucide.dev): ícones · [date-fns](https://date-fns.org): datas · [Sonner](https://sonner.emilkowal.ski): avisos

## Estrutura

```
src/
├── components/
│   ├── layout/        Menu lateral, cabeçalho, busca global e estrutura das páginas
│   ├── ui/            Botões, campos, tabelas, selos, abas, menus e janelas
│   └── Graficos.tsx   Gráficos de barras e de rosca
├── data/exemplo.ts    Dados de exemplo (membros, grupos, atividades...)
├── lib/               Formatação, regras de negócio, relatórios e arquivos
├── pages/             Uma pasta por módulo do sistema
├── store/             Estado global (dados, sessão e permissões)
└── types.ts           Modelos de dados
```

## Observações

- **Cores dos gráficos:** a ordem das cores da rosca foi ajustada (azul, verde, roxo, laranja) para ficar legível também para pessoas com daltonismo; no Figma, azul e roxo ficavam lado a lado.
- **Próximo passo:** para uso real, ligar o sistema a uma API e a um banco de dados no lugar do armazenamento no navegador. As funções em `src/store/dados.ts` concentram todas as operações e são o ponto de troca.
