import type { Dados } from '@/data/exemplo';
import type { FormatoRelatorio, TipoRelatorio } from '@/types';
import { formatarData, formatarMesAno, limitesDoPeriodo, noPeriodo } from './formatacao';
import { origemAtividade, resumoVagas, situacaoDemanda } from './regras';

export const TITULO_RELATORIO: Record<TipoRelatorio, string> = {
  membros: 'Membros por território',
  atividades: 'Atividades',
  inscricoes: 'Inscrições e frequência',
  demandas: 'Demandas',
};

export interface TabelaRelatorio {
  titulo?: string;
  colunas: string[];
  linhas: (string | number)[][];
}

export interface ConteudoRelatorio {
  titulo: string;
  periodo: string;
  resumo: [string, string][];
  tabelas: TabelaRelatorio[];
}

/** Monta as tabelas de cada tipo de relatório a partir dos dados do sistema. */
export function montarRelatorio(tipo: TipoRelatorio, periodo: string, dados: Dados): ConteudoRelatorio {
  const { fim } = limitesDoPeriodo(periodo);
  const nomeUsuario = (id: string) => dados.usuarios.find((u) => u.id === id)?.nome ?? '—';

  if (tipo === 'membros') {
    const membros = dados.membros.filter((m) => m.criadoEm <= fim).sort((a, b) => a.codigo.localeCompare(b.codigo));
    const porBairro = new Map<string, number>();
    membros.forEach((m) => porBairro.set(m.bairro || 'Não informado', (porBairro.get(m.bairro || 'Não informado') ?? 0) + 1));
    return {
      titulo: TITULO_RELATORIO.membros,
      periodo,
      resumo: [
        ['Membros cadastrados', String(membros.length)],
        ['Ativos', String(membros.filter((m) => m.situacao === 'Ativo').length)],
        ['Inativos', String(membros.filter((m) => m.situacao === 'Inativo').length)],
      ],
      tabelas: [
        {
          titulo: 'Membros por território',
          colunas: ['Território/Bairro', 'Membros', '%'],
          linhas: [...porBairro.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([bairro, n]) => [bairro, n, `${Math.round((n / Math.max(1, membros.length)) * 100)}%`]),
        },
        {
          titulo: 'Lista de membros',
          colunas: ['Código', 'Nome', 'Telefone', 'Bairro', 'Município', 'Situação', 'Cadastro'],
          linhas: membros.map((m) => [m.codigo, m.nome, m.telefone || '—', m.bairro || '—', m.municipio || '—', m.situacao, formatarData(m.criadoEm)]),
        },
      ],
    };
  }

  if (tipo === 'atividades') {
    const atividades = dados.atividades
      .filter((a) => noPeriodo(a.data, periodo))
      .sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio));
    const linhas = atividades.map((a) => {
      const v = resumoVagas(a, dados.inscricoes);
      return [formatarData(a.data), a.titulo, origemAtividade(a, dados.grupos), `${a.horaInicio} - ${a.horaFim}`, a.local || '—', a.vagas, v.confirmadas, v.presentes, a.situacao];
    });
    return {
      titulo: TITULO_RELATORIO.atividades,
      periodo,
      resumo: [
        ['Atividades no período', String(atividades.length)],
        ['Concluídas', String(atividades.filter((a) => a.situacao === 'Concluída').length)],
        ['Canceladas', String(atividades.filter((a) => a.situacao === 'Cancelada').length)],
      ],
      tabelas: [
        {
          colunas: ['Data', 'Atividade', 'Organização', 'Horário', 'Local', 'Vagas', 'Inscritos', 'Presentes', 'Situação'],
          linhas,
        },
      ],
    };
  }

  if (tipo === 'inscricoes') {
    const atividades = dados.atividades.filter((a) => noPeriodo(a.data, periodo)).sort((a, b) => a.data.localeCompare(b.data));
    let totalInscritos = 0;
    let totalPresentes = 0;
    let totalMarcados = 0;
    const linhas = atividades.map((a) => {
      const v = resumoVagas(a, dados.inscricoes);
      totalInscritos += v.confirmadas;
      totalPresentes += v.presentes;
      totalMarcados += dados.inscricoes.filter((i) => i.atividadeId === a.id && i.situacao === 'Confirmada' && i.presente !== null).length;
      return [a.titulo, formatarData(a.data), a.vagas, v.confirmadas, v.espera, v.presentes, v.taxaPresenca === null ? '—' : `${v.taxaPresenca}%`];
    });
    return {
      titulo: TITULO_RELATORIO.inscricoes,
      periodo,
      resumo: [
        ['Inscrições confirmadas', String(totalInscritos)],
        ['Presenças registradas', String(totalPresentes)],
        ['Frequência média', totalMarcados ? `${Math.round((totalPresentes / totalMarcados) * 100)}%` : '—'],
      ],
      tabelas: [{ colunas: ['Atividade', 'Data', 'Vagas', 'Inscritos', 'Lista de espera', 'Presentes', 'Frequência'], linhas }],
    };
  }

  const demandas = dados.demandas.filter((d) => d.criadaEm <= fim).sort((a, b) => b.codigo.localeCompare(a.codigo));
  const comSituacao = demandas.map((d) => ({ d, s: situacaoDemanda(d) }));
  return {
    titulo: TITULO_RELATORIO.demandas,
    periodo,
    resumo: [
      ['Demandas registradas', String(demandas.length)],
      ['Em andamento', String(comSituacao.filter((x) => x.s === 'Em andamento').length)],
      ['Atrasadas', String(comSituacao.filter((x) => x.s === 'Atrasada').length)],
      ['Concluídas', String(comSituacao.filter((x) => x.s === 'Concluída').length)],
    ],
    tabelas: [
      {
        colunas: ['Código', 'Título', 'Categoria', 'Prioridade', 'Responsável', 'Prazo', 'Situação'],
        linhas: comSituacao.map(({ d, s }) => [d.codigo, d.titulo, d.categoria || '—', d.prioridade, nomeUsuario(d.responsavelId), formatarData(d.prazo), s]),
      },
    ],
  };
}

/** Gera e baixa o arquivo (PDF ou Excel). As bibliotecas só são carregadas quando usadas. */
export async function baixarRelatorio(conteudo: ConteudoRelatorio, formato: FormatoRelatorio, nomeBase: string) {
  if (formato === 'PDF') await gerarPdf(conteudo, `${nomeBase}.pdf`);
  else await gerarXlsx(conteudo, `${nomeBase}.xlsx`);
}

async function gerarPdf(c: ConteudoRelatorio, nomeArquivo: string) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();

  doc.setFillColor(21, 101, 216);
  doc.rect(0, 0, largura, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 60, 140);
  doc.text('SESFA · Gestão de Comunidade', 14, 14);
  doc.setFontSize(18);
  doc.setTextColor(22, 35, 59);
  doc.text(c.titulo, 14, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Período: ${formatarMesAno(c.periodo)}  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 31);

  let y = 40;
  if (c.resumo.length) {
    autoTable(doc, {
      startY: y,
      body: c.resumo,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1.5, textColor: [22, 35, 59] },
      columnStyles: { 0: { textColor: [100, 116, 139], cellWidth: 60 }, 1: { fontStyle: 'bold' } },
      margin: { left: 14 },
      tableWidth: 110,
    });
    y = ultimoY(doc) + 8;
  }

  for (const tabela of c.tabelas) {
    if (tabela.titulo) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(22, 35, 59);
      doc.text(tabela.titulo, 14, y);
      y += 3;
    }
    autoTable(doc, {
      startY: y,
      head: [tabela.colunas],
      body: tabela.linhas.length ? tabela.linhas : [[{ content: 'Nenhum registro no período.', colSpan: tabela.colunas.length }]],
      styles: { fontSize: 9, cellPadding: 2.2, textColor: [22, 35, 59], lineColor: [227, 232, 240] },
      headStyles: { fillColor: [21, 101, 216], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [244, 247, 251] },
      margin: { left: 14, right: 14 },
    });
    y = ultimoY(doc) + 10;
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${p} de ${paginas}`, largura - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }
  doc.save(nomeArquivo);
}

function ultimoY(doc: unknown): number {
  return (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
}

async function gerarXlsx(c: ConteudoRelatorio, nomeArquivo: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  type Celula = { value: string | number; fontWeight?: 'bold'; backgroundColor?: string; textColor?: string; fontSize?: number } | null;
  const linhas: Celula[][] = [
    [{ value: `SESFA · ${c.titulo}`, fontWeight: 'bold', fontSize: 14 }],
    [{ value: `Período: ${formatarMesAno(c.periodo)}`, textColor: '#64748B' }],
    [null],
    ...c.resumo.map(([rotulo, valor]): Celula[] => [{ value: rotulo }, { value: valor, fontWeight: 'bold' }]),
  ];
  for (const tabela of c.tabelas) {
    linhas.push([null]);
    if (tabela.titulo) linhas.push([{ value: tabela.titulo, fontWeight: 'bold' }]);
    linhas.push(tabela.colunas.map((col) => ({ value: col, fontWeight: 'bold', backgroundColor: '#E6EEFB' })));
    tabela.linhas.forEach((l) => linhas.push(l.map((v) => ({ value: v }))));
  }
  const colunas = Math.max(...c.tabelas.map((t) => t.colunas.length), 2);
  await writeXlsxFile(linhas, { columns: Array.from({ length: colunas }, (_, i) => ({ width: i === 1 ? 36 : 18 })) }).toFile(nomeArquivo);
}
