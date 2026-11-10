import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { criarDadosDeExemplo, type Dados } from '@/data/exemplo';
import { formatarData, gerarId, hojeISO } from '@/lib/formatacao';
import { useSessao } from '@/store/sessao';
import type {
  Atividade,
  Comunicado,
  Demanda,
  Documento,
  EventoHistorico,
  Grupo,
  Inscricao,
  Membro,
  Notificacao,
  Perfil,
  RelatorioGerado,
  SituacaoTarefa,
  Tarefa,
  Usuario,
} from '@/types';

export type DadosMembro = Omit<Membro, 'id' | 'codigo' | 'criadoEm'>;
export type DadosGrupo = Omit<Grupo, 'id' | 'codigo' | 'membroIds'>;
export type DadosAtividade = Omit<Atividade, 'id'>;
export type DadosComunicado = Omit<Comunicado, 'id' | 'criadoEm'>;
export type DadosDemanda = Omit<Demanda, 'id' | 'codigo' | 'tarefas' | 'historico' | 'criadaEm' | 'concluidaEm'>;
export type DadosTarefa = Omit<Tarefa, 'id'>;
export type DadosUsuario = Omit<Usuario, 'id' | 'ultimoAcesso'>;
export type DadosDocumento = Omit<Documento, 'id' | 'enviadoPor' | 'data'>;

export type Resultado = { ok: true; mensagem?: string } | { ok: false; erro: string };

interface Acoes {
  salvarMembro: (dados: DadosMembro, id?: string) => Membro;
  alternarSituacaoMembro: (id: string) => void;
  excluirMembro: (id: string) => void;

  salvarGrupo: (dados: DadosGrupo, id?: string) => Grupo;
  alternarSituacaoGrupo: (id: string) => void;
  excluirGrupo: (id: string) => void;
  adicionarMembrosAoGrupo: (grupoId: string, membroIds: string[]) => void;
  removerMembroDoGrupo: (grupoId: string, membroId: string) => void;

  salvarAtividade: (dados: DadosAtividade, id?: string) => Atividade;
  excluirAtividade: (id: string) => void;

  inscrever: (atividadeId: string, membroId: string) => Resultado;
  cancelarInscricao: (id: string) => void;
  promoverInscricao: (id: string) => Resultado;
  definirPresenca: (id: string, presente: boolean | null) => void;
  registrarPresenca: (atividadeId: string) => void;

  salvarComunicado: (dados: DadosComunicado, id?: string) => Comunicado;
  publicarComunicado: (id: string) => void;
  excluirComunicado: (id: string) => void;

  marcarComoLida: (id: string) => void;
  marcarTodasComoLidas: () => void;

  salvarDemanda: (dados: DadosDemanda, id?: string) => Demanda;
  excluirDemanda: (id: string) => void;
  salvarTarefa: (demandaId: string, dados: DadosTarefa, tarefaId?: string) => void;
  alternarTarefa: (demandaId: string, tarefaId: string) => void;
  definirSituacaoTarefa: (demandaId: string, tarefaId: string, situacao: SituacaoTarefa) => void;
  excluirTarefa: (demandaId: string, tarefaId: string) => void;

  salvarUsuario: (dados: DadosUsuario, id?: string) => Resultado;
  alternarSituacaoUsuario: (id: string) => void;
  excluirUsuario: (id: string) => void;
  registrarAcesso: (id: string) => void;
  salvarPerfis: (perfis: Perfil[]) => void;

  adicionarDocumento: (dados: DadosDocumento, id?: string) => Documento;
  excluirDocumento: (id: string) => void;

  registrarRelatorio: (dados: Omit<RelatorioGerado, 'id' | 'geradoPor' | 'geradoEm'>) => RelatorioGerado;

  restaurarExemplo: () => void;
}

export type EstadoDados = Dados & Acoes;

/** Próximo código sequencial ("026", "D-013"...). */
function proximoCodigo(codigos: string[], digitos: number, prefixo = ''): string {
  const maior = codigos.reduce((max, c) => Math.max(max, Number(c.replace(/\D/g, '')) || 0), 0);
  return `${prefixo}${String(maior + 1).padStart(digitos, '0')}`;
}

export const useDados = create<EstadoDados>()(
  persist(
    (set, get) => {
      /** Nome de quem está usando o sistema (vai para histórico e "enviado por"). */
      const autor = () => {
        const id = useSessao.getState().usuarioId;
        return get().usuarios.find((u) => u.id === id)?.nome ?? 'Sistema';
      };

      const notificar = (n: Omit<Notificacao, 'id' | 'criadaEm' | 'lida'>) =>
        set((s) => ({
          notificacoes: [{ ...n, id: gerarId(), criadaEm: new Date().toISOString(), lida: false }, ...s.notificacoes],
        }));

      const evento = (titulo: string, detalhe: string): EventoHistorico => ({
        id: gerarId(),
        titulo,
        detalhe,
        data: hojeISO(),
      });

      const atualizarDemanda = (id: string, alterar: (d: Demanda) => Demanda) =>
        set((s) => ({ demandas: s.demandas.map((d) => (d.id === id ? alterar(d) : d)) }));

      return {
        ...criarDadosDeExemplo(),

        // ------------------------------------------------------------ Membros
        salvarMembro: (dados, id) => {
          if (id) {
            const atualizado = { ...get().membros.find((m) => m.id === id)!, ...dados };
            set((s) => ({ membros: s.membros.map((m) => (m.id === id ? atualizado : m)) }));
            return atualizado;
          }
          const novo: Membro = {
            ...dados,
            id: gerarId(),
            codigo: proximoCodigo(get().membros.map((m) => m.codigo), 3),
            criadoEm: hojeISO(),
          };
          set((s) => ({ membros: [...s.membros, novo] }));
          notificar({ tipo: 'membro', titulo: 'Novo membro cadastrado', descricao: `${novo.nome} foi adicionado(a)`, link: `/membros/${novo.id}/editar` });
          return novo;
        },
        alternarSituacaoMembro: (id) =>
          set((s) => ({
            membros: s.membros.map((m) => (m.id === id ? { ...m, situacao: m.situacao === 'Ativo' ? 'Inativo' : 'Ativo' } : m)),
          })),
        excluirMembro: (id) =>
          set((s) => ({
            membros: s.membros.filter((m) => m.id !== id),
            grupos: s.grupos.map((g) => ({ ...g, membroIds: g.membroIds.filter((mid) => mid !== id) })),
            inscricoes: s.inscricoes.filter((i) => i.membroId !== id),
          })),

        // ------------------------------------------------------------- Grupos
        salvarGrupo: (dados, id) => {
          if (id) {
            const atualizado = { ...get().grupos.find((g) => g.id === id)!, ...dados };
            set((s) => ({ grupos: s.grupos.map((g) => (g.id === id ? atualizado : g)) }));
            return atualizado;
          }
          const novo: Grupo = {
            ...dados,
            id: gerarId(),
            codigo: proximoCodigo(get().grupos.map((g) => g.codigo), 2),
            membroIds: [],
          };
          set((s) => ({ grupos: [...s.grupos, novo] }));
          return novo;
        },
        alternarSituacaoGrupo: (id) =>
          set((s) => ({
            grupos: s.grupos.map((g) => (g.id === id ? { ...g, situacao: g.situacao === 'Ativo' ? 'Inativo' : 'Ativo' } : g)),
          })),
        excluirGrupo: (id) =>
          set((s) => ({
            grupos: s.grupos.filter((g) => g.id !== id),
            atividades: s.atividades.map((a) => (a.grupoId === id ? { ...a, grupoId: '' } : a)),
            demandas: s.demandas.map((d) => (d.grupoId === id ? { ...d, grupoId: '' } : d)),
          })),
        adicionarMembrosAoGrupo: (grupoId, membroIds) =>
          set((s) => ({
            grupos: s.grupos.map((g) =>
              g.id === grupoId ? { ...g, membroIds: [...new Set([...g.membroIds, ...membroIds])] } : g,
            ),
          })),
        removerMembroDoGrupo: (grupoId, membroId) =>
          set((s) => ({
            grupos: s.grupos.map((g) =>
              g.id === grupoId ? { ...g, membroIds: g.membroIds.filter((m) => m !== membroId) } : g,
            ),
          })),

        // --------------------------------------------------------- Atividades
        salvarAtividade: (dados, id) => {
          if (id) {
            const atualizada = { ...get().atividades.find((a) => a.id === id)!, ...dados };
            set((s) => ({ atividades: s.atividades.map((a) => (a.id === id ? atualizada : a)) }));
            return atualizada;
          }
          const nova: Atividade = { ...dados, id: gerarId() };
          set((s) => ({ atividades: [...s.atividades, nova] }));
          return nova;
        },
        excluirAtividade: (id) =>
          set((s) => ({
            atividades: s.atividades.filter((a) => a.id !== id),
            inscricoes: s.inscricoes.filter((i) => i.atividadeId !== id),
          })),

        // --------------------------------------------------------- Inscrições
        inscrever: (atividadeId, membroId) => {
          const { atividades, inscricoes, membros } = get();
          const atividade = atividades.find((a) => a.id === atividadeId);
          const membro = membros.find((m) => m.id === membroId);
          if (!atividade || !membro) return { ok: false, erro: 'Atividade ou membro não encontrado.' };
          if (atividade.situacao === 'Cancelada' || atividade.situacao === 'Concluída') {
            return { ok: false, erro: `Não é possível se inscrever: a atividade está ${atividade.situacao.toLowerCase()}.` };
          }
          if (membro.situacao === 'Inativo') return { ok: false, erro: 'Membros inativos não podem ser inscritos.' };
          const daAtividade = inscricoes.filter((i) => i.atividadeId === atividadeId && i.situacao !== 'Cancelada');
          if (daAtividade.some((i) => i.membroId === membroId)) {
            return { ok: false, erro: 'Este membro já está inscrito nesta atividade.' };
          }
          const confirmadas = daAtividade.filter((i) => i.situacao === 'Confirmada').length;
          const situacao = confirmadas < atividade.vagas ? 'Confirmada' : 'Lista de espera';
          const nova: Inscricao = {
            id: gerarId(),
            atividadeId,
            membroId,
            situacao,
            presente: null,
            criadaEm: new Date().toISOString(),
          };
          set((s) => ({ inscricoes: [...s.inscricoes, nova] }));
          notificar({
            tipo: 'inscricao',
            titulo: `Nova inscrição na ${atividade.titulo}`,
            descricao: situacao === 'Confirmada' ? `${membro.nome} se inscreveu` : `${membro.nome} entrou na lista de espera`,
            link: `/atividades/${atividadeId}`,
          });
          return situacao === 'Confirmada'
            ? { ok: true, mensagem: 'Inscrição confirmada.' }
            : { ok: true, mensagem: 'Não há vagas: o membro entrou na lista de espera.' };
        },
        cancelarInscricao: (id) => {
          const inscricao = get().inscricoes.find((i) => i.id === id);
          if (!inscricao) return;
          set((s) => ({
            inscricoes: s.inscricoes.map((i) => (i.id === id ? { ...i, situacao: 'Cancelada', presente: null } : i)),
          }));
          const temEspera = get().inscricoes.some(
            (i) => i.atividadeId === inscricao.atividadeId && i.situacao === 'Lista de espera',
          );
          if (inscricao.situacao === 'Confirmada' && temEspera) {
            const atividade = get().atividades.find((a) => a.id === inscricao.atividadeId);
            notificar({
              tipo: 'vaga',
              titulo: `Vaga liberada na ${atividade?.titulo ?? 'atividade'}`,
              descricao: 'Primeiro da lista de espera pode ser promovido',
              link: `/atividades/${inscricao.atividadeId}`,
            });
          }
        },
        promoverInscricao: (id) => {
          const { inscricoes, atividades } = get();
          const inscricao = inscricoes.find((i) => i.id === id);
          const atividade = atividades.find((a) => a.id === inscricao?.atividadeId);
          if (!inscricao || !atividade) return { ok: false, erro: 'Inscrição não encontrada.' };
          const confirmadas = inscricoes.filter(
            (i) => i.atividadeId === atividade.id && i.situacao === 'Confirmada',
          ).length;
          if (confirmadas >= atividade.vagas) return { ok: false, erro: 'Não há vagas livres nesta atividade.' };
          set((s) => ({
            inscricoes: s.inscricoes.map((i) => (i.id === id ? { ...i, situacao: 'Confirmada' } : i)),
          }));
          return { ok: true, mensagem: 'Inscrição promovida para confirmada.' };
        },
        definirPresenca: (id, presente) =>
          set((s) => ({ inscricoes: s.inscricoes.map((i) => (i.id === id ? { ...i, presente } : i)) })),
        registrarPresenca: (atividadeId) => {
          const atividade = get().atividades.find((a) => a.id === atividadeId);
          if (!atividade) return;
          notificar({
            tipo: 'presenca',
            titulo: 'Presença registrada',
            descricao: `Sessão de ${formatarData(atividade.data)} salva com sucesso`,
            link: `/atividades/${atividadeId}`,
          });
        },

        // -------------------------------------------------------- Comunicados
        salvarComunicado: (dados, id) => {
          const anterior = id ? get().comunicados.find((c) => c.id === id) : undefined;
          const salvo: Comunicado = anterior
            ? { ...anterior, ...dados }
            : { ...dados, id: gerarId(), criadoEm: new Date().toISOString() };
          if (salvo.situacao === 'Publicado' && !salvo.dataPublicacao) salvo.dataPublicacao = hojeISO();
          set((s) => ({
            comunicados: anterior
              ? s.comunicados.map((c) => (c.id === id ? salvo : c))
              : [salvo, ...s.comunicados],
          }));
          if (salvo.situacao === 'Publicado' && anterior?.situacao !== 'Publicado' && salvo.notificar) {
            notificar({ tipo: 'comunicado', titulo: 'Comunicado publicado', descricao: salvo.titulo, link: `/comunicados/${salvo.id}/editar` });
          }
          return salvo;
        },
        publicarComunicado: (id) => {
          const c = get().comunicados.find((x) => x.id === id);
          if (!c) return;
          const { id: _ignorado, criadoEm: _c, ...resto } = c;
          get().salvarComunicado({ ...resto, situacao: 'Publicado', notificar: true }, id);
        },
        excluirComunicado: (id) => set((s) => ({ comunicados: s.comunicados.filter((c) => c.id !== id) })),

        // ------------------------------------------------------- Notificações
        marcarComoLida: (id) =>
          set((s) => ({ notificacoes: s.notificacoes.map((n) => (n.id === id ? { ...n, lida: true } : n)) })),
        marcarTodasComoLidas: () =>
          set((s) => ({ notificacoes: s.notificacoes.map((n) => ({ ...n, lida: true })) })),

        // ----------------------------------------------------------- Demandas
        salvarDemanda: (dados, id) => {
          const quem = autor();
          if (id) {
            const anterior = get().demandas.find((d) => d.id === id)!;
            const eventos: EventoHistorico[] = [];
            if (anterior.situacao !== dados.situacao) eventos.push(evento(`Situação alterada para ${dados.situacao}`, quem));
            if (anterior.prioridade !== dados.prioridade) eventos.push(evento(`Prioridade alterada para ${dados.prioridade}`, quem));
            if (anterior.responsavelId !== dados.responsavelId) {
              const nome = get().usuarios.find((u) => u.id === dados.responsavelId)?.nome ?? 'sem responsável';
              eventos.push(evento(`Responsável alterado para ${nome}`, quem));
            }
            if (anterior.prazo !== dados.prazo) eventos.push(evento(`Prazo alterado para ${formatarData(dados.prazo)}`, quem));
            if (eventos.length === 0) eventos.push(evento('Informações atualizadas', quem));
            const atualizada: Demanda = {
              ...anterior,
              ...dados,
              concluidaEm: dados.situacao === 'Concluída' ? anterior.concluidaEm || hojeISO() : '',
              historico: [...eventos, ...anterior.historico],
            };
            set((s) => ({ demandas: s.demandas.map((d) => (d.id === id ? atualizada : d)) }));
            if (anterior.situacao !== dados.situacao) {
              notificar({ tipo: 'demanda', titulo: 'Demanda atualizada', descricao: `Status alterado para ${dados.situacao}`, link: `/demandas/${id}` });
            }
            return atualizada;
          }
          const nova: Demanda = {
            ...dados,
            id: gerarId(),
            codigo: proximoCodigo(get().demandas.map((d) => d.codigo), 3, 'D-'),
            tarefas: [],
            historico: [evento('Demanda criada', quem)],
            criadaEm: hojeISO(),
            concluidaEm: dados.situacao === 'Concluída' ? hojeISO() : '',
          };
          set((s) => ({ demandas: [nova, ...s.demandas] }));
          return nova;
        },
        excluirDemanda: (id) => set((s) => ({ demandas: s.demandas.filter((d) => d.id !== id) })),
        salvarTarefa: (demandaId, dados, tarefaId) =>
          atualizarDemanda(demandaId, (d) => ({
            ...d,
            tarefas: tarefaId
              ? d.tarefas.map((t) => (t.id === tarefaId ? { ...t, ...dados } : t))
              : [...d.tarefas, { ...dados, id: gerarId() }],
            historico: [evento(tarefaId ? 'Tarefa atualizada' : 'Tarefa criada', dados.titulo), ...d.historico],
          })),
        alternarTarefa: (demandaId, tarefaId) => {
          const tarefa = get().demandas.find((d) => d.id === demandaId)?.tarefas.find((t) => t.id === tarefaId);
          if (!tarefa) return;
          get().definirSituacaoTarefa(demandaId, tarefaId, tarefa.situacao === 'Concluída' ? 'Pendente' : 'Concluída');
        },
        definirSituacaoTarefa: (demandaId, tarefaId, situacao) =>
          atualizarDemanda(demandaId, (d) => {
            const tarefa = d.tarefas.find((t) => t.id === tarefaId);
            if (!tarefa || tarefa.situacao === situacao) return d;
            const titulo = situacao === 'Concluída' ? 'Tarefa concluída' : situacao === 'Em andamento' ? 'Tarefa iniciada' : 'Tarefa reaberta';
            return {
              ...d,
              tarefas: d.tarefas.map((t) => (t.id === tarefaId ? { ...t, situacao } : t)),
              historico: [evento(titulo, tarefa.titulo), ...d.historico],
            };
          }),
        excluirTarefa: (demandaId, tarefaId) =>
          atualizarDemanda(demandaId, (d) => {
            const tarefa = d.tarefas.find((t) => t.id === tarefaId);
            return {
              ...d,
              tarefas: d.tarefas.filter((t) => t.id !== tarefaId),
              historico: tarefa ? [evento('Tarefa removida', tarefa.titulo), ...d.historico] : d.historico,
            };
          }),

        // ----------------------------------------------------------- Usuários
        salvarUsuario: (dados, id) => {
          const email = dados.email.trim().toLowerCase();
          if (get().usuarios.some((u) => u.email.toLowerCase() === email && u.id !== id)) {
            return { ok: false, erro: 'Já existe um usuário com este e-mail.' };
          }
          if (id) {
            set((s) => ({ usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, ...dados, email } : u)) }));
          } else {
            set((s) => ({ usuarios: [...s.usuarios, { ...dados, email, id: gerarId(), ultimoAcesso: '' }] }));
          }
          return { ok: true };
        },
        alternarSituacaoUsuario: (id) =>
          set((s) => ({
            usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, situacao: u.situacao === 'Ativo' ? 'Inativo' : 'Ativo' } : u)),
          })),
        excluirUsuario: (id) => set((s) => ({ usuarios: s.usuarios.filter((u) => u.id !== id) })),
        registrarAcesso: (id) =>
          set((s) => ({
            usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, ultimoAcesso: new Date().toISOString() } : u)),
          })),
        salvarPerfis: (perfis) => set({ perfis }),

        // --------------------------------------------------------- Documentos
        adicionarDocumento: (dados, id) => {
          const novo: Documento = { ...dados, id: id ?? gerarId(), enviadoPor: autor(), data: hojeISO() };
          set((s) => ({ documentos: [novo, ...s.documentos] }));
          return novo;
        },
        excluirDocumento: (id) => set((s) => ({ documentos: s.documentos.filter((d) => d.id !== id) })),

        // --------------------------------------------------------- Relatórios
        registrarRelatorio: (dados) => {
          const novo: RelatorioGerado = { ...dados, id: gerarId(), geradoPor: autor(), geradoEm: new Date().toISOString() };
          set((s) => ({ relatorios: [novo, ...s.relatorios] }));
          return novo;
        },

        restaurarExemplo: () => set(criarDadosDeExemplo()),
      };
    },
    {
      name: 'sesfa-dados',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
