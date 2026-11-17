-- Banco de dados do SESFA (SQLite).
-- As colunas usam os mesmos nomes dos campos do front-end (src/types.ts).
-- Datas sem hora: "aaaa-mm-dd". Datas com hora: ISO completo. Campos opcionais vazios: ''.

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------ Acesso
CREATE TABLE IF NOT EXISTS perfis (
  id        TEXT PRIMARY KEY,
  nome      TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT ''
);

-- Uma linha por perfil e módulo, com o que o perfil pode fazer nele.
CREATE TABLE IF NOT EXISTS permissoes (
  perfilId   TEXT    NOT NULL REFERENCES perfis (id) ON DELETE CASCADE,
  modulo     TEXT    NOT NULL,
  visualizar INTEGER NOT NULL DEFAULT 0 CHECK (visualizar IN (0, 1)),
  criar      INTEGER NOT NULL DEFAULT 0 CHECK (criar IN (0, 1)),
  editar     INTEGER NOT NULL DEFAULT 0 CHECK (editar IN (0, 1)),
  excluir    INTEGER NOT NULL DEFAULT 0 CHECK (excluir IN (0, 1)),
  PRIMARY KEY (perfilId, modulo)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id           TEXT PRIMARY KEY,
  nome         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senhaHash    TEXT NOT NULL,                      -- bcrypt; a senha nunca é guardada
  perfilId     TEXT NOT NULL REFERENCES perfis (id),
  situacao     TEXT NOT NULL DEFAULT 'Ativo' CHECK (situacao IN ('Ativo', 'Inativo')),
  ultimoAcesso TEXT NOT NULL DEFAULT ''
);

-- ------------------------------------------------------------ Comunidade
CREATE TABLE IF NOT EXISTS membros (
  id            TEXT PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  nome          TEXT NOT NULL,
  nascimento    TEXT NOT NULL DEFAULT '',
  identificador TEXT NOT NULL DEFAULT '',
  telefone      TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  municipio     TEXT NOT NULL DEFAULT '',
  bairro        TEXT NOT NULL DEFAULT '',
  situacao      TEXT NOT NULL DEFAULT 'Ativo' CHECK (situacao IN ('Ativo', 'Inativo')),
  criadoEm      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grupos (
  id            TEXT PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  nome          TEXT NOT NULL,
  responsavelId TEXT NOT NULL DEFAULT '',          -- usuário responsável
  objetivo      TEXT NOT NULL DEFAULT '',
  municipio     TEXT NOT NULL DEFAULT '',
  bairro        TEXT NOT NULL DEFAULT '',
  criadoEm      TEXT NOT NULL,
  situacao      TEXT NOT NULL DEFAULT 'Ativo' CHECK (situacao IN ('Ativo', 'Inativo'))
);

-- Membros de cada grupo (relação muitos-para-muitos).
CREATE TABLE IF NOT EXISTS grupoMembros (
  grupoId  TEXT NOT NULL REFERENCES grupos (id) ON DELETE CASCADE,
  membroId TEXT NOT NULL REFERENCES membros (id) ON DELETE CASCADE,
  PRIMARY KEY (grupoId, membroId)
);

-- ------------------------------------------------------------ Atividades e inscrições
CREATE TABLE IF NOT EXISTS atividades (
  id         TEXT PRIMARY KEY,
  titulo     TEXT    NOT NULL,
  tipo       TEXT    NOT NULL,
  grupoId    TEXT    NOT NULL DEFAULT '',          -- '' = atividade sem grupo
  data       TEXT    NOT NULL,
  horaInicio TEXT    NOT NULL,
  horaFim    TEXT    NOT NULL,
  local      TEXT    NOT NULL DEFAULT '',
  vagas      INTEGER NOT NULL CHECK (vagas >= 0),
  situacao   TEXT    NOT NULL,
  descricao  TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inscricoes (
  id          TEXT PRIMARY KEY,
  atividadeId TEXT    NOT NULL REFERENCES atividades (id) ON DELETE CASCADE,
  membroId    TEXT    NOT NULL REFERENCES membros (id) ON DELETE CASCADE,
  situacao    TEXT    NOT NULL CHECK (situacao IN ('Confirmada', 'Lista de espera', 'Cancelada')),
  presente    INTEGER CHECK (presente IN (0, 1)),  -- NULL = presença ainda não marcada
  criadaEm    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inscricoes_atividade ON inscricoes (atividadeId);
CREATE INDEX IF NOT EXISTS idx_inscricoes_membro ON inscricoes (membroId);

-- ------------------------------------------------------------ Comunicação
CREATE TABLE IF NOT EXISTS comunicados (
  id             TEXT PRIMARY KEY,
  titulo         TEXT    NOT NULL,
  categoria      TEXT    NOT NULL,
  publico        TEXT    NOT NULL,
  dataPublicacao TEXT    NOT NULL DEFAULT '',
  mensagem       TEXT    NOT NULL DEFAULT '',
  notificar      INTEGER NOT NULL DEFAULT 0 CHECK (notificar IN (0, 1)),
  situacao       TEXT    NOT NULL CHECK (situacao IN ('Publicado', 'Rascunho')),
  criadoEm       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id        TEXT PRIMARY KEY,
  tipo      TEXT NOT NULL,
  titulo    TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  criadaEm  TEXT NOT NULL,
  link      TEXT NOT NULL DEFAULT ''
);

-- Quem já leu cada notificação (cada usuário marca as suas).
CREATE TABLE IF NOT EXISTS notificacoesLidas (
  notificacaoId TEXT NOT NULL REFERENCES notificacoes (id) ON DELETE CASCADE,
  usuarioId     TEXT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  PRIMARY KEY (notificacaoId, usuarioId)
);

-- ------------------------------------------------------------ Demandas
CREATE TABLE IF NOT EXISTS demandas (
  id            TEXT PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  titulo        TEXT NOT NULL,
  categoria     TEXT NOT NULL,
  prioridade    TEXT NOT NULL CHECK (prioridade IN ('Alta', 'Média', 'Baixa')),
  responsavelId TEXT NOT NULL DEFAULT '',
  prazo         TEXT NOT NULL DEFAULT '',
  bairro        TEXT NOT NULL DEFAULT '',
  grupoId       TEXT NOT NULL DEFAULT '',
  situacao      TEXT NOT NULL CHECK (situacao IN ('Aberta', 'Em andamento', 'Concluída')),
  descricao     TEXT NOT NULL DEFAULT '',
  criadaEm      TEXT NOT NULL,
  concluidaEm   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tarefas (
  id            TEXT PRIMARY KEY,
  demandaId     TEXT NOT NULL REFERENCES demandas (id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  responsavelId TEXT NOT NULL DEFAULT '',
  prazo         TEXT NOT NULL DEFAULT '',
  situacao      TEXT NOT NULL CHECK (situacao IN ('Pendente', 'Em andamento', 'Concluída'))
);
CREATE INDEX IF NOT EXISTS idx_tarefas_demanda ON tarefas (demandaId);

CREATE TABLE IF NOT EXISTS historicoDemandas (
  id        TEXT PRIMARY KEY,
  demandaId TEXT NOT NULL REFERENCES demandas (id) ON DELETE CASCADE,
  titulo    TEXT NOT NULL,
  detalhe   TEXT NOT NULL DEFAULT '',
  data      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_historico_demanda ON historicoDemandas (demandaId);

-- ------------------------------------------------------------ Documentos e relatórios
CREATE TABLE IF NOT EXISTS documentos (
  id            TEXT PRIMARY KEY,
  nome          TEXT    NOT NULL,
  tipo          TEXT    NOT NULL CHECK (tipo IN ('PDF', 'DOCX', 'XLSX')),
  vinculoTipo   TEXT    NOT NULL,                  -- modulo, grupo, atividade ou demanda
  vinculoId     TEXT    NOT NULL,
  vinculoRotulo TEXT    NOT NULL,
  enviadoPor    TEXT    NOT NULL,
  data          TEXT    NOT NULL,
  tamanho       INTEGER NOT NULL DEFAULT 0,
  temArquivo    INTEGER NOT NULL DEFAULT 0 CHECK (temArquivo IN (0, 1)) -- o arquivo fica em server/dados/arquivos/<id>
);

CREATE TABLE IF NOT EXISTS relatorios (
  id        TEXT PRIMARY KEY,
  tipo      TEXT NOT NULL,
  periodo   TEXT NOT NULL,                         -- mês "aaaa-mm"
  formato   TEXT NOT NULL CHECK (formato IN ('PDF', 'XLSX')),
  geradoPor TEXT NOT NULL,
  geradoEm  TEXT NOT NULL
);
