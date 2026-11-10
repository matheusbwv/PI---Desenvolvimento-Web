import { addDays, addMonths, format, getDaysInMonth, subDays, subHours, subMinutes } from 'date-fns';
import type {
  Atividade,
  Comunicado,
  Demanda,
  Documento,
  Grupo,
  Inscricao,
  Membro,
  Notificacao,
  Perfil,
  Permissoes,
  RelatorioGerado,
  Usuario,
} from '@/types';

/**
 * Senha de demonstração aceita para todos os usuários cadastrados.
 * O sistema não tem servidor: o login é simulado no navegador.
 * Usuários de teste: adm@sesfa.org (Administrador), ana.silva@sesfa.org (Coordenador),
 * joao.pereira@sesfa.org (Operador), paulo.henrique@sesfa.org (Consulta).
 */
export const SENHA_DEMO = 'sesfa123';

export interface Dados {
  membros: Membro[];
  grupos: Grupo[];
  atividades: Atividade[];
  inscricoes: Inscricao[];
  comunicados: Comunicado[];
  notificacoes: Notificacao[];
  demandas: Demanda[];
  usuarios: Usuario[];
  perfis: Perfil[];
  documentos: Documento[];
  relatorios: RelatorioGerado[];
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

function permissoes(mapa: Record<string, string>): Permissoes {
  // "VCEX" = visualizar, criar, editar, excluir
  const linha = (s = '') => ({
    visualizar: s.includes('V'),
    criar: s.includes('C'),
    editar: s.includes('E'),
    excluir: s.includes('X'),
  });
  return {
    membros: linha(mapa.membros),
    grupos: linha(mapa.grupos),
    atividades: linha(mapa.atividades),
    inscricoes: linha(mapa.inscricoes),
    comunicados: linha(mapa.comunicados),
    demandas: linha(mapa.demandas),
    relatorios: linha(mapa.relatorios),
    administracao: linha(mapa.administracao),
  };
}

/** Cria o conjunto de dados de exemplo. As atividades são montadas no mês atual. */
export function criarDadosDeExemplo(): Dados {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();
  const hoje = iso(agora);

  /** Dia do mês atual (deslocado em `meses`), limitado ao último dia do mês. */
  const dia = (d: number, meses = 0) => {
    const base = addMonths(new Date(ano, mes, 1), meses);
    return iso(new Date(base.getFullYear(), base.getMonth(), Math.min(d, getDaysInMonth(base))));
  };
  const horario = (data: Date, h: number, m: number) => {
    const alvo = new Date(data);
    alvo.setHours(h, m, 0, 0);
    return (alvo > agora ? subMinutes(agora, 5) : alvo).toISOString();
  };

  // ---------------------------------------------------------------- Perfis
  const perfis: Perfil[] = [
    {
      id: 'p-admin',
      nome: 'Administrador',
      descricao: 'Acesso total',
      permissoes: permissoes({
        membros: 'VCEX', grupos: 'VCEX', atividades: 'VCEX', inscricoes: 'VCEX',
        comunicados: 'VCEX', demandas: 'VCEX', relatorios: 'VCEX', administracao: 'VCEX',
      }),
    },
    {
      id: 'p-coord',
      nome: 'Coordenador',
      descricao: 'Gerencia grupos e atividades',
      permissoes: permissoes({
        membros: 'VCE', grupos: 'VCE', atividades: 'VCEX', inscricoes: 'VCE',
        comunicados: 'VCE', demandas: 'VCE', relatorios: 'V', administracao: '',
      }),
    },
    {
      id: 'p-oper',
      nome: 'Operador',
      descricao: 'Cadastros e presença',
      permissoes: permissoes({
        membros: 'VCE', grupos: 'V', atividades: 'V', inscricoes: 'VCE',
        comunicados: 'V', demandas: 'VC', relatorios: '', administracao: '',
      }),
    },
    {
      id: 'p-cons',
      nome: 'Consulta',
      descricao: 'Somente leitura',
      permissoes: permissoes({
        membros: 'V', grupos: 'V', atividades: 'V', inscricoes: 'V',
        comunicados: 'V', demandas: 'V', relatorios: 'V', administracao: '',
      }),
    },
  ];

  // -------------------------------------------------------------- Usuários
  const usuarios: Usuario[] = [
    { id: 'u1', nome: 'Usuário ADM', email: 'adm@sesfa.org', perfilId: 'p-admin', situacao: 'Ativo', ultimoAcesso: horario(agora, 8, 12) },
    { id: 'u2', nome: 'Ana Silva', email: 'ana.silva@sesfa.org', perfilId: 'p-coord', situacao: 'Ativo', ultimoAcesso: horario(agora, 7, 45) },
    { id: 'u3', nome: 'Carla Souza', email: 'carla.souza@sesfa.org', perfilId: 'p-coord', situacao: 'Ativo', ultimoAcesso: horario(subDays(agora, 1), 17, 30) },
    { id: 'u4', nome: 'João Pereira', email: 'joao.pereira@sesfa.org', perfilId: 'p-oper', situacao: 'Ativo', ultimoAcesso: horario(subDays(agora, 16), 10, 5) },
    { id: 'u5', nome: 'Luciana Mendes', email: 'luciana.m@sesfa.org', perfilId: 'p-cons', situacao: 'Inativo', ultimoAcesso: horario(subDays(agora, 29), 15, 40) },
    { id: 'u6', nome: 'Roberto Lima', email: 'roberto.lima@sesfa.org', perfilId: 'p-oper', situacao: 'Ativo', ultimoAcesso: horario(subDays(agora, 3), 9, 20) },
    { id: 'u7', nome: 'Fernanda Costa', email: 'fernanda.costa@sesfa.org', perfilId: 'p-oper', situacao: 'Ativo', ultimoAcesso: horario(subDays(agora, 5), 14, 2) },
    { id: 'u8', nome: 'Paulo Henrique', email: 'paulo.henrique@sesfa.org', perfilId: 'p-cons', situacao: 'Ativo', ultimoAcesso: horario(subDays(agora, 8), 11, 48) },
  ];

  // --------------------------------------------------------------- Membros
  // [nome, telefone, bairro, situação, nascimento, criado há N meses (0 = este mês)]
  const listaMembros: [string, string, string, 'Ativo' | 'Inativo', string, number][] = [
    ['Maria Silva Santos', '(88) 98765-4321', 'Centro', 'Ativo', '1990-04-12', 8],
    ['João Pedro Oliveira', '(88) 91234-5678', 'Jardim Esperança', 'Ativo', '2004-09-03', 8],
    ['Ana Clara Lima', '(89) 99876-5432', 'Vila Nova', 'Ativo', '2001-01-22', 7],
    ['Carlos Eduardo', '(88) 98123-4567', 'Centro', 'Inativo', '1985-07-30', 7],
    ['Beatriz Souza', '(88) 97654-3210', 'Parque das Flores', 'Ativo', '1998-12-05', 0],
    ['Rafael Gomes', '(88) 98811-2233', 'Centro', 'Ativo', '2006-03-17', 6],
    ['Juliana Ferreira', '(88) 99702-4455', 'Jardim Esperança', 'Ativo', '1993-06-25', 6],
    ['Pedro Henrique Alves', '(88) 98655-6677', 'Vila Nova', 'Ativo', '2007-10-11', 5],
    ['Larissa Rocha', '(88) 99610-8899', 'Centro', 'Ativo', '1996-02-08', 5],
    ['Antônio Carlos Batista', '(88) 98577-1020', 'Parque das Flores', 'Ativo', '1958-05-19', 5],
    ['Francisca Oliveira', '(88) 99555-3040', 'Jardim Esperança', 'Ativo', '1972-11-02', 4],
    ['Gabriel Martins', '(88) 98433-5060', 'Centro', 'Ativo', '2005-08-14', 4],
    ['Camila Ribeiro', '(88) 99321-7080', 'Vila Nova', 'Ativo', '2003-04-27', 4],
    ['Lucas Andrade', '(88) 98210-9010', 'São José', 'Inativo', '1999-09-09', 3],
    ['Raimunda Silva', '(88) 99198-1122', 'Jardim Esperança', 'Ativo', '1961-01-15', 3],
    ['Mateus Cardoso', '(88) 98087-3344', 'Centro', 'Ativo', '2008-06-06', 3],
    ['Patrícia Nunes', '(88) 99976-5566', 'Parque das Flores', 'Ativo', '1988-03-29', 2],
    ['José Wilson Freitas', '(88) 98865-7788', 'Centro', 'Ativo', '1966-12-20', 2],
    ['Letícia Barros', '(88) 99754-9900', 'Vila Nova', 'Ativo', '2002-07-07', 2],
    ['Diego Monteiro', '(88) 98643-2211', 'Jardim Esperança', 'Ativo', '1995-10-31', 1],
    ['Sandra Melo', '(88) 99532-4433', 'Centro', 'Ativo', '1979-02-14', 1],
    ['Vinícius Teixeira', '(88) 98421-6655', 'Alto da Boa Vista', 'Ativo', '2000-05-05', 1],
    ['Aline Correia', '(88) 99310-8877', 'Jardim Esperança', 'Ativo', '1997-08-18', 0],
    ['Francisco das Chagas', '(88) 98299-0099', 'Centro', 'Ativo', '1955-09-24', 0],
    ['Bruna Cavalcante', '(88) 99188-1212', 'Parque das Flores', 'Ativo', '2004-12-01', 0],
  ];
  const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const membros: Membro[] = listaMembros.map(([nome, telefone, bairro, situacao, nascimento, mesesAtras], i) => {
    const partes = semAcento(nome).split(' ');
    const criado = mesesAtras === 0 ? subDays(agora, i === 4 ? 2 : 1 + (i % 5)) : addDays(addMonths(new Date(ano, mes, 1), -mesesAtras), 3 + (i % 20));
    return {
      id: `m${i + 1}`,
      codigo: String(i + 1).padStart(3, '0'),
      nome,
      nascimento,
      identificador: i % 3 === 0 ? `SES-${String(1000 + i * 7)}` : '',
      telefone,
      email: i % 2 === 0 ? `${partes[0]}.${partes[partes.length - 1]}@email.com` : '',
      municipio: i % 6 === 5 ? 'Crato' : 'Juazeiro do Norte',
      bairro,
      situacao,
      criadoEm: iso(criado),
    };
  });

  // ---------------------------------------------------------------- Grupos
  const grupos: Grupo[] = [
    {
      id: 'g1', codigo: '01', nome: 'Jovens em Ação', responsavelId: 'u2',
      objetivo: 'Desenvolvimento de jovens da comunidade por meio de atividades culturais, esportivas e de formação.',
      municipio: 'Juazeiro do Norte', bairro: 'Centro', criadoEm: '2024-03-12', situacao: 'Ativo',
      membroIds: ['m1', 'm2', 'm4', 'm6', 'm8', 'm12', 'm13', 'm16', 'm19', 'm22', 'm25'],
    },
    {
      id: 'g2', codigo: '02', nome: 'Mães da Comunidade', responsavelId: 'u3',
      objetivo: 'Apoio e troca de experiências entre mães da comunidade, com rodas de conversa e encontros mensais.',
      municipio: 'Juazeiro do Norte', bairro: 'Jardim Esperança', criadoEm: '2024-05-20', situacao: 'Ativo',
      membroIds: ['m5', 'm7', 'm9', 'm11', 'm15', 'm17', 'm21', 'm23'],
    },
    {
      id: 'g3', codigo: '03', nome: 'Esporte e Cidadania', responsavelId: 'u4',
      objetivo: 'Atividades esportivas para crianças e adolescentes, promovendo cidadania e convivência.',
      municipio: 'Juazeiro do Norte', bairro: 'Vila Nova', criadoEm: '2024-08-02', situacao: 'Ativo',
      membroIds: ['m2', 'm3', 'm6', 'm8', 'm12', 'm14', 'm16', 'm20'],
    },
    {
      id: 'g4', codigo: '04', nome: 'Arte e Cultura', responsavelId: 'u5',
      objetivo: 'Oficinas culturais de música, dança, artesanato e teatro.',
      municipio: 'Juazeiro do Norte', bairro: 'Centro', criadoEm: '2023-11-15', situacao: 'Inativo',
      membroIds: ['m1', 'm9', 'm13', 'm19'],
    },
    {
      id: 'g5', codigo: '05', nome: 'Terceira Idade Ativa', responsavelId: 'u3',
      objetivo: 'Atividades de convivência, saúde e lazer para as pessoas idosas da comunidade.',
      municipio: 'Juazeiro do Norte', bairro: 'Parque das Flores', criadoEm: iso(subDays(agora, 40)), situacao: 'Ativo',
      membroIds: ['m10', 'm15', 'm18', 'm24'],
    },
    {
      id: 'g6', codigo: '06', nome: 'Horta Comunitária', responsavelId: 'u2',
      objetivo: 'Cultivo de alimentos e educação ambiental em um espaço coletivo do bairro.',
      municipio: 'Crato', bairro: 'São José', criadoEm: iso(subDays(agora, 20)), situacao: 'Ativo',
      membroIds: ['m11', 'm14', 'm18', 'm20', 'm22'],
    },
  ];

  // ------------------------------------------------------------ Atividades
  const passou = (data: string) => data < hoje;
  const atividade = (
    id: string, titulo: string, tipo: Atividade['tipo'], grupoId: string, data: string,
    horaInicio: string, horaFim: string, local: string, vagas: number, situacao: Atividade['situacao'], descricao = '',
  ): Atividade => ({
    id, titulo, tipo, grupoId, data, horaInicio, horaFim, local, vagas,
    situacao: passou(data) && situacao !== 'Cancelada' ? 'Concluída' : situacao,
    descricao,
  });

  const atividades: Atividade[] = [
    atividade('a1', 'Esporte e Cidadania', 'Atividade do grupo', 'g3', dia(8), '15:00', '17:00', 'Quadra da Vila Nova', 30, 'Confirmado', 'Treino de futsal e conversa sobre convivência e respeito.'),
    atividade('a2', 'Encontro de Mães', 'Atividade do grupo', 'g2', dia(14), '19:00', '21:00', 'Salão Paroquial', 25, 'Confirmado', 'Encontro mensal com troca de experiências.'),
    atividade('a3', 'Oficina de Música', 'Atividade do grupo', 'g1', dia(19), '14:00', '16:00', 'Centro Comunitário', 15, 'Em planejamento', 'Introdução a violão e percussão.'),
    atividade('a4', 'Oficina de Artes', 'Atividade do grupo', 'g1', dia(25), '14:00', '16:00', 'Centro Comunitário — Sala 2', 10, 'Inscrições abertas', 'Pintura e reaproveitamento de materiais recicláveis.'),
    atividade('a5', 'Reunião da Coordenação', 'Organização interna', '', dia(26), '09:00', '11:00', 'Sede do SESFA', 12, 'Confirmado', 'Planejamento das atividades do próximo mês.'),
    atividade('a6', 'Campanha de Doação de Alimentos', 'Evento comunitário', '', dia(28), '08:00', '17:00', 'Praça Central', 50, 'Em planejamento', 'Arrecadação de alimentos não perecíveis para as famílias da comunidade.'),
    atividade('a7', 'Roda de Conversa', 'Atividade do grupo', 'g2', dia(30), '18:30', '20:00', 'Salão Paroquial', 20, 'Inscrições abertas', 'Tema: saúde mental e cuidado com quem cuida.'),
    // Histórico dos meses anteriores (alimenta os indicadores)
    atividade('h1', 'Mutirão de Limpeza', 'Evento comunitário', '', dia(12, -1), '07:00', '11:00', 'Praça Central', 40, 'Concluída'),
    atividade('h2', 'Oficina de Artes', 'Atividade do grupo', 'g1', dia(22, -1), '14:00', '16:00', 'Centro Comunitário', 15, 'Concluída'),
    atividade('h3', 'Encontro de Mães', 'Atividade do grupo', 'g2', dia(15, -1), '19:00', '21:00', 'Salão Paroquial', 25, 'Concluída'),
    atividade('h4', 'Torneio de Futsal', 'Atividade do grupo', 'g3', dia(9, -2), '08:00', '12:00', 'Quadra da Vila Nova', 30, 'Concluída'),
    atividade('h5', 'Roda de Conversa', 'Atividade do grupo', 'g2', dia(18, -2), '18:30', '20:00', 'Salão Paroquial', 20, 'Concluída'),
    atividade('h6', 'Reunião da Coordenação', 'Organização interna', '', dia(25, -2), '09:00', '11:00', 'Sede do SESFA', 12, 'Concluída'),
    atividade('h7', 'Feira de Saúde', 'Evento comunitário', '', dia(6, -3), '08:00', '13:00', 'Escola Municipal', 60, 'Concluída'),
    atividade('h8', 'Oficina de Música', 'Atividade do grupo', 'g1', dia(20, -3), '14:00', '16:00', 'Centro Comunitário', 15, 'Concluída'),
    atividade('h9', 'Palestra sobre Cidadania', 'Evento comunitário', '', dia(10, -4), '19:00', '21:00', 'Centro Comunitário', 50, 'Concluída'),
    atividade('h10', 'Encontro de Mães', 'Atividade do grupo', 'g2', dia(14, -4), '19:00', '21:00', 'Salão Paroquial', 25, 'Concluída'),
  ];

  // ------------------------------------------------------------ Inscrições
  const inscricoes: Inscricao[] = [];
  const inscrever = (
    atividadeId: string, membroIds: string[], situacao: Inscricao['situacao'] = 'Confirmada', ausentes: string[] = [],
  ) => {
    const ativ = atividades.find((a) => a.id === atividadeId)!;
    const realizada = ativ.situacao === 'Concluída';
    membroIds.forEach((membroId, i) => {
      // Inscrição alguns dias antes da atividade, mas nunca depois de hoje.
      const quando = subDays(new Date(`${ativ.data}T12:00:00`), 10 - (i % 8));
      inscricoes.push({
        id: `i-${atividadeId}-${membroId}`,
        atividadeId,
        membroId,
        situacao,
        presente: realizada && situacao === 'Confirmada' ? !ausentes.includes(membroId) : null,
        criadaEm: (quando > agora ? subHours(agora, 20 + i * 9) : quando).toISOString(),
      });
    });
  };
  const ids = (...n: number[]) => n.map((x) => `m${x}`);

  inscrever('a1', ids(2, 3, 6, 8, 12, 14, 16, 20, 19, 13, 22, 25), 'Confirmada', ids(14, 22));
  inscrever('a2', ids(5, 7, 9, 11, 15, 17, 21, 23));
  inscrever('a4', ids(2, 6, 8, 12, 13, 16, 19, 25));
  inscrever('a4', ids(4), 'Cancelada');
  inscrever('a4', ids(20, 21), 'Lista de espera');
  inscrever('a5', ids(1, 9, 18, 21, 24, 10));
  inscrever('a7', ids(5, 7, 11, 15, 23));
  inscrever('h1', ids(1, 2, 3, 6, 9, 10, 11, 12, 15, 18, 20, 21, 24), 'Confirmada', ids(3, 24));
  inscrever('h2', ids(1, 2, 6, 8, 12, 13), 'Confirmada', ids(13));
  inscrever('h3', ids(5, 7, 9, 11, 15, 17), 'Confirmada');
  inscrever('h4', ids(2, 3, 6, 8, 12, 14, 16, 20, 19, 22, 25), 'Confirmada', ids(19));
  inscrever('h5', ids(5, 7, 11, 15, 17, 21, 23, 9), 'Confirmada', ids(23));
  inscrever('h6', ids(1, 9, 18, 21, 10), 'Confirmada');
  inscrever('h7', ids(1, 4, 5, 7, 10, 11, 15, 18, 21, 24, 17, 9), 'Confirmada', ids(4, 17));
  inscrever('h8', ids(1, 6, 12, 13, 19), 'Confirmada', ids(6));
  inscrever('h9', ids(1, 2, 3, 4, 9, 10, 11, 18, 21), 'Confirmada', ids(4));
  inscrever('h10', ids(5, 7, 9, 11, 15, 17, 21), 'Confirmada', ids(21));
  // Inscrição mais recente (aparece nas notificações)
  inscricoes.push({ id: 'i-a4-m1', atividadeId: 'a4', membroId: 'm1', situacao: 'Confirmada', presente: null, criadaEm: subMinutes(agora, 10).toISOString() });

  // ----------------------------------------------------------- Comunicados
  const comunicados: Comunicado[] = [
    {
      id: 'c1', titulo: 'Campanha de Doação de Alimentos', categoria: 'Evento', publico: 'Todos os membros',
      dataPublicacao: hoje, situacao: 'Publicado', notificar: true, criadoEm: subHours(agora, 2).toISOString(),
      mensagem: 'Estamos arrecadando alimentos não perecíveis para as famílias da comunidade. As doações podem ser entregues na sede do SESFA até o dia da campanha.',
    },
    {
      id: 'c2', titulo: 'Reunião de Coordenadores', categoria: 'Organização', publico: 'Coordenadores',
      dataPublicacao: iso(subDays(agora, 2)), situacao: 'Publicado', notificar: true, criadoEm: subDays(agora, 2).toISOString(),
      mensagem: 'Convidamos todos os coordenadores para a reunião mensal. Pauta: calendário de atividades e prestação de contas.',
    },
    {
      id: 'c3', titulo: 'Inscrições para Novas Oficinas', categoria: 'Inscrições', publico: 'Todos os membros',
      dataPublicacao: iso(subDays(agora, 5)), situacao: 'Publicado', notificar: false, criadoEm: subDays(agora, 5).toISOString(),
      mensagem: 'Estão abertas as inscrições para as oficinas do próximo mês. As vagas são limitadas e preenchidas por ordem de inscrição.',
    },
    {
      id: 'c4', titulo: 'Mudança de horário da Roda de Conversa', categoria: 'Aviso', publico: 'Grupo Mães da Comunidade',
      dataPublicacao: '', situacao: 'Rascunho', notificar: false, criadoEm: subDays(agora, 1).toISOString(),
      mensagem: 'Rascunho aguardando revisão antes da publicação. A Roda de Conversa passará a começar às 18h30.',
    },
    {
      id: 'c5', titulo: 'Resultado da Pesquisa Comunitária', categoria: 'Informativo', publico: 'Todos os membros',
      dataPublicacao: iso(subDays(agora, 10)), situacao: 'Publicado', notificar: false, criadoEm: subDays(agora, 10).toISOString(),
      mensagem: 'Divulgação dos resultados da pesquisa de satisfação realizada com os membros e famílias atendidas.',
    },
  ];

  // --------------------------------------------------------- Notificações
  const notificacoes: Notificacao[] = [
    { id: 'n1', tipo: 'inscricao', titulo: 'Nova inscrição na Oficina de Artes', descricao: 'Maria Silva Santos se inscreveu', criadaEm: subMinutes(agora, 10).toISOString(), lida: false, link: '/atividades/a4' },
    { id: 'n2', tipo: 'vaga', titulo: 'Vaga liberada na Oficina de Artes', descricao: 'Primeiro da lista de espera pode ser promovido', criadaEm: subHours(agora, 1).toISOString(), lida: false, link: '/atividades/a4' },
    { id: 'n3', tipo: 'comunicado', titulo: 'Comunicado publicado', descricao: 'Campanha de Doação de Alimentos', criadaEm: subHours(agora, 2).toISOString(), lida: false, link: '/comunicados/c1/editar' },
    { id: 'n4', tipo: 'presenca', titulo: 'Presença registrada', descricao: `Sessão de ${format(new Date(`${dia(8)}T12:00:00`), 'dd/MM/yyyy')} salva com sucesso`, criadaEm: subDays(agora, 1).toISOString(), lida: true, link: '/atividades/a1' },
    { id: 'n5', tipo: 'demanda', titulo: 'Demanda atualizada', descricao: 'Status alterado para Em andamento', criadaEm: subHours(subDays(agora, 1), 2).toISOString(), lida: true, link: '/demandas/d12' },
    { id: 'n6', tipo: 'membro', titulo: 'Novo membro cadastrado', descricao: 'Beatriz Souza foi adicionada', criadaEm: subDays(agora, 2).toISOString(), lida: true, link: '/membros/m5/editar' },
  ];

  // -------------------------------------------------------------- Demandas
  const criada = (data: string, autor = 'Usuário ADM') => ({ id: `h-${data}-${autor}`, titulo: 'Demanda criada', detalhe: autor, data });
  const demanda = (d: Partial<Demanda> & Pick<Demanda, 'id' | 'codigo' | 'titulo'>): Demanda => ({
    categoria: 'Infraestrutura', prioridade: 'Média', responsavelId: 'u2', prazo: '', bairro: 'Centro', grupoId: '',
    situacao: 'Aberta', descricao: '', tarefas: [], historico: [criada(d.criadaEm ?? hoje)], criadaEm: hoje, concluidaEm: '',
    ...d,
  });

  const demandas: Demanda[] = [
    demanda({
      id: 'd12', codigo: 'D-012', titulo: 'Reforma do telhado do Centro Comunitário', categoria: 'Infraestrutura', prioridade: 'Alta',
      responsavelId: 'u2', prazo: '2026-11-15', bairro: 'Centro', situacao: 'Em andamento', criadaEm: '2026-10-01',
      descricao: 'O telhado do Centro Comunitário apresenta goteiras e telhas quebradas, o que impede o uso do salão em dias de chuva.',
      tarefas: [
        { id: 't1', titulo: 'Levantar orçamento com fornecedores', responsavelId: 'u2', prazo: '2026-10-05', situacao: 'Concluída' },
        { id: 't2', titulo: 'Aprovar orçamento na reunião', responsavelId: 'u3', prazo: '2026-10-12', situacao: 'Concluída' },
        { id: 't3', titulo: 'Comprar telhas e madeiramento', responsavelId: 'u4', prazo: '2026-10-20', situacao: 'Concluída' },
        { id: 't4', titulo: 'Organizar mutirão de voluntários', responsavelId: 'u5', prazo: '2026-11-08', situacao: 'Em andamento' },
        { id: 't5', titulo: 'Vistoria final da obra', responsavelId: 'u2', prazo: '2026-11-15', situacao: 'Pendente' },
      ],
      historico: [
        { id: 'hd1', titulo: 'Tarefa concluída', detalhe: 'Comprar telhas', data: '2026-10-20' },
        { id: 'hd2', titulo: 'Prioridade alterada para Alta', detalhe: 'Ana Silva', data: '2026-10-14' },
        { id: 'hd3', titulo: 'Orçamento aprovado', detalhe: 'Carla Souza', data: '2026-10-12' },
        { id: 'hd4', titulo: 'Demanda criada', detalhe: 'Usuário ADM', data: '2026-10-01' },
      ],
    }),
    demanda({
      id: 'd11', codigo: 'D-011', titulo: 'Solicitação de cestas básicas', categoria: 'Assistência', prioridade: 'Média',
      responsavelId: 'u3', prazo: '2026-11-10', bairro: 'Jardim Esperança', situacao: 'Aberta', criadaEm: '2026-10-28',
      descricao: 'Famílias cadastradas no Jardim Esperança solicitaram apoio com cestas básicas para o mês.',
      tarefas: [{ id: 't6', titulo: 'Levantar famílias que precisam de apoio', responsavelId: 'u3', prazo: '2026-11-05', situacao: 'Pendente' }],
    }),
    demanda({
      id: 'd10', codigo: 'D-010', titulo: 'Material para oficina de artes', categoria: 'Atividades', prioridade: 'Baixa',
      responsavelId: 'u4', prazo: '2026-11-05', bairro: 'Centro', grupoId: 'g1', situacao: 'Concluída', criadaEm: '2026-10-15', concluidaEm: '2026-11-03',
      descricao: 'Compra de tintas, pincéis e papel para a Oficina de Artes do grupo Jovens em Ação.',
      tarefas: [
        { id: 't7', titulo: 'Montar lista de materiais', responsavelId: 'u4', prazo: '2026-10-20', situacao: 'Concluída' },
        { id: 't8', titulo: 'Comprar materiais', responsavelId: 'u4', prazo: '2026-11-03', situacao: 'Concluída' },
      ],
    }),
    demanda({
      id: 'd09', codigo: 'D-009', titulo: 'Iluminação da praça central', categoria: 'Infraestrutura', prioridade: 'Alta',
      responsavelId: 'u5', prazo: '2026-10-25', bairro: 'Centro', situacao: 'Em andamento', criadaEm: '2026-09-18',
      descricao: 'Postes sem lâmpada deixam a praça escura à noite. Solicitar reparo à prefeitura.',
      tarefas: [
        { id: 't9', titulo: 'Protocolar pedido na prefeitura', responsavelId: 'u5', prazo: '2026-09-25', situacao: 'Concluída' },
        { id: 't10', titulo: 'Acompanhar a execução do reparo', responsavelId: 'u5', prazo: '2026-10-25', situacao: 'Em andamento' },
      ],
    }),
    demanda({
      id: 'd08', codigo: 'D-008', titulo: 'Curso de capacitação para jovens', categoria: 'Formação', prioridade: 'Média',
      responsavelId: 'u2', prazo: '2026-11-30', bairro: 'Vila Nova', grupoId: 'g1', situacao: 'Em andamento', criadaEm: '2026-10-05',
      descricao: 'Curso de informática básica e preparação para o primeiro emprego.',
      tarefas: [
        { id: 't11', titulo: 'Definir parceiro para o curso', responsavelId: 'u2', prazo: '2026-10-20', situacao: 'Concluída' },
        { id: 't12', titulo: 'Abrir inscrições', responsavelId: 'u4', prazo: '2026-11-15', situacao: 'Em andamento' },
        { id: 't13', titulo: 'Reservar laboratório', responsavelId: 'u2', prazo: '2026-11-20', situacao: 'Pendente' },
      ],
    }),
    demanda({ id: 'd07', codigo: 'D-007', titulo: 'Limpeza do terreno da horta', categoria: 'Meio ambiente', prioridade: 'Baixa', responsavelId: 'u2', prazo: '2026-09-30', bairro: 'São José', grupoId: 'g6', situacao: 'Concluída', criadaEm: '2026-09-02', concluidaEm: '2026-09-27' }),
    demanda({ id: 'd06', codigo: 'D-006', titulo: 'Campanha de agasalhos', categoria: 'Assistência', prioridade: 'Média', responsavelId: 'u3', prazo: '2026-08-20', bairro: 'Jardim Esperança', situacao: 'Concluída', criadaEm: '2026-07-25', concluidaEm: '2026-08-18' }),
    demanda({ id: 'd05', codigo: 'D-005', titulo: 'Reparo dos bancos da praça', categoria: 'Infraestrutura', prioridade: 'Baixa', responsavelId: 'u4', prazo: '2026-08-10', bairro: 'Centro', situacao: 'Concluída', criadaEm: '2026-07-10', concluidaEm: '2026-08-12' }),
    demanda({ id: 'd04', codigo: 'D-004', titulo: 'Transporte para torneio esportivo', categoria: 'Atividades', prioridade: 'Média', responsavelId: 'u4', prazo: '2026-09-12', bairro: 'Vila Nova', grupoId: 'g3', situacao: 'Concluída', criadaEm: '2026-08-20', concluidaEm: '2026-09-10' }),
    demanda({ id: 'd03', codigo: 'D-003', titulo: 'Kits escolares para crianças', categoria: 'Assistência', prioridade: 'Alta', responsavelId: 'u3', prazo: '2026-12-05', bairro: 'Parque das Flores', situacao: 'Aberta', criadaEm: '2026-10-30' }),
    demanda({ id: 'd02', codigo: 'D-002', titulo: 'Instalação de bebedouro na quadra', categoria: 'Infraestrutura', prioridade: 'Média', responsavelId: 'u4', prazo: '2026-12-15', bairro: 'Vila Nova', grupoId: 'g3', situacao: 'Aberta', criadaEm: '2026-11-02' }),
    demanda({ id: 'd01', codigo: 'D-001', titulo: 'Mapeamento de famílias em vulnerabilidade', categoria: 'Saúde', prioridade: 'Alta', responsavelId: 'u2', prazo: '2026-09-01', bairro: 'Centro', situacao: 'Concluída', criadaEm: '2026-07-01', concluidaEm: '2026-08-29' }),
  ];

  // ------------------------------------------------------------ Documentos
  const documentos: Documento[] = [
    { id: 'doc1', nome: 'Ata da reunião de coordenação', tipo: 'PDF', vinculo: { tipo: 'modulo', id: 'atividades', rotulo: 'Atividades' }, enviadoPor: 'Ana Silva', data: '2026-10-26', tamanho: 240 * 1024, temArquivo: false },
    { id: 'doc2', nome: 'Lista de materiais da oficina', tipo: 'XLSX', vinculo: { tipo: 'atividade', id: 'a4', rotulo: 'Oficina de Artes' }, enviadoPor: 'João Pereira', data: '2026-10-24', tamanho: 88 * 1024, temArquivo: false },
    { id: 'doc3', nome: 'Orçamento do telhado', tipo: 'PDF', vinculo: { tipo: 'demanda', id: 'd12', rotulo: 'Demanda D-012' }, enviadoPor: 'Carla Souza', data: '2026-10-12', tamanho: 1.2 * 1024 * 1024, temArquivo: false },
    { id: 'doc4', nome: 'Regimento interno dos grupos', tipo: 'DOCX', vinculo: { tipo: 'modulo', id: 'grupos', rotulo: 'Grupos' }, enviadoPor: 'Usuário ADM', data: '2026-10-02', tamanho: 156 * 1024, temArquivo: false },
    { id: 'doc5', nome: 'Termo de autorização de imagem', tipo: 'PDF', vinculo: { tipo: 'modulo', id: 'membros', rotulo: 'Membros' }, enviadoPor: 'Usuário ADM', data: '2026-09-28', tamanho: 310 * 1024, temArquivo: false },
    { id: 'doc6', nome: 'Plano de atividades do semestre', tipo: 'DOCX', vinculo: { tipo: 'grupo', id: 'g1', rotulo: 'Jovens em Ação' }, enviadoPor: 'Ana Silva', data: '2026-09-15', tamanho: 120 * 1024, temArquivo: false },
  ];

  // ------------------------------------------------------------ Relatórios
  const relatorios: RelatorioGerado[] = [
    { id: 'r1', tipo: 'inscricoes', periodo: '2026-10', formato: 'PDF', geradoPor: 'Usuário ADM', geradoEm: '2026-10-27T10:00:00' },
    { id: 'r2', tipo: 'membros', periodo: '2026-09', formato: 'XLSX', geradoPor: 'Ana Silva', geradoEm: '2026-09-30T16:20:00' },
    { id: 'r3', tipo: 'demandas', periodo: '2026-09', formato: 'PDF', geradoPor: 'Usuário ADM', geradoEm: '2026-09-29T09:15:00' },
    { id: 'r4', tipo: 'atividades', periodo: '2026-08', formato: 'XLSX', geradoPor: 'Carla Souza', geradoEm: '2026-08-31T17:45:00' },
  ];

  return { membros, grupos, atividades, inscricoes, comunicados, notificacoes, demandas, usuarios, perfis, documentos, relatorios };
}
