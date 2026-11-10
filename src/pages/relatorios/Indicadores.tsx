import { clsx } from 'clsx';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { colorirCategorias, GraficoBarras, GraficoRosca, type Fatia } from '@/components/Graficos';
import { Abas } from '@/components/ui/Abas';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { CartaoComTitulo, CartaoNumero } from '@/components/ui/Cartao';
import { MenuOpcoes } from '@/components/ui/Menus';
import type { Dados } from '@/data/exemplo';
import {
  formatarMesAno,
  formatarMesCurto,
  limitesDoPeriodo,
  noPeriodo,
  opcoesDePeriodo,
  periodoAtual,
  somarMeses,
  ultimosPeriodos,
  variacaoPercentual,
} from '@/lib/formatacao';
import { BAIRROS, CATEGORIAS_DEMANDA, PRIORIDADES, TIPOS_ATIVIDADE } from '@/lib/opcoes';
import { baixarRelatorio, type TabelaRelatorio } from '@/lib/relatorios';
import { situacaoDemanda } from '@/lib/regras';
import { useDados } from '@/store/dados';

type Aba = 'geral' | 'membros' | 'atividades' | 'inscricoes' | 'demandas';

interface Numero {
  rotulo: string;
  valor: string | number;
  detalhe?: string;
  positiva?: boolean;
}

interface Painel {
  numeros: Numero[];
  barras: { titulo: string; nome: string; sufixo?: string; dados: { rotulo: string; valor: number }[] };
  rosca: { titulo: string; nome: string; fatias: Fatia[] };
}

const contar = (itens: string[]) => {
  const mapa = new Map<string, number>();
  itens.forEach((i) => mapa.set(i, (mapa.get(i) ?? 0) + 1));
  return mapa;
};

/** Calcula os números e gráficos de cada aba para o mês escolhido. */
function montarPainel(aba: Aba, periodo: string, d: Dados): Painel {
  const anterior = somarMeses(periodo, -1);
  const fim = (p: string) => limitesDoPeriodo(p).fim;
  const meses = ultimosPeriodos(periodo, 5);
  const delta = (atual: number, antes: number) => {
    const v = variacaoPercentual(atual, antes);
    return { detalhe: v.texto, positiva: v.positiva };
  };

  const atividadesDo = (p: string) => d.atividades.filter((a) => noPeriodo(a.data, p) && a.situacao !== 'Cancelada');
  const inscricoesDo = (p: string) => {
    const ids = new Set(atividadesDo(p).map((a) => a.id));
    return d.inscricoes.filter((i) => ids.has(i.atividadeId) && i.situacao !== 'Cancelada');
  };
  const membrosAte = (p: string) => d.membros.filter((m) => m.criadoEm <= fim(p));
  const participacao = {
    titulo: 'Participação nas atividades',
    nome: 'inscrições confirmadas',
    dados: meses.map((p) => ({ rotulo: formatarMesCurto(p), valor: inscricoesDo(p).filter((i) => i.situacao === 'Confirmada').length })),
  };
  const territorio = {
    titulo: 'Membros por território',
    nome: 'membros',
    fatias: colorirCategorias(BAIRROS, contar(membrosAte(periodo).map((m) => m.bairro || 'Não informado'))),
  };

  if (aba === 'geral') {
    const ativos = (p: string) => membrosAte(p).filter((m) => m.situacao === 'Ativo').length;
    const grupos = (p: string) => d.grupos.filter((g) => g.criadoEm <= fim(p) && g.situacao === 'Ativo').length;
    return {
      numeros: [
        { rotulo: 'Membros ativos', valor: ativos(periodo), ...delta(ativos(periodo), ativos(anterior)) },
        { rotulo: 'Atividades realizadas', valor: atividadesDo(periodo).length, ...delta(atividadesDo(periodo).length, atividadesDo(anterior).length) },
        { rotulo: 'Inscrições', valor: inscricoesDo(periodo).length, ...delta(inscricoesDo(periodo).length, inscricoesDo(anterior).length) },
        { rotulo: 'Grupos ativos', valor: grupos(periodo), ...delta(grupos(periodo), grupos(anterior)) },
      ],
      barras: participacao,
      rosca: territorio,
    };
  }

  if (aba === 'membros') {
    const ate = membrosAte(periodo);
    const novos = (p: string) => d.membros.filter((m) => noPeriodo(m.criadoEm, p)).length;
    return {
      numeros: [
        { rotulo: 'Membros cadastrados', valor: ate.length },
        { rotulo: 'Ativos', valor: ate.filter((m) => m.situacao === 'Ativo').length },
        { rotulo: 'Inativos', valor: ate.filter((m) => m.situacao === 'Inativo').length },
        { rotulo: 'Novos no mês', valor: novos(periodo), ...delta(novos(periodo), novos(anterior)) },
      ],
      barras: { titulo: 'Novos membros por mês', nome: 'novos membros', dados: meses.map((p) => ({ rotulo: formatarMesCurto(p), valor: novos(p) })) },
      rosca: territorio,
    };
  }

  if (aba === 'atividades') {
    const doMes = atividadesDo(periodo);
    const canceladas = d.atividades.filter((a) => noPeriodo(a.data, periodo) && a.situacao === 'Cancelada').length;
    const inscritos = inscricoesDo(periodo).filter((i) => i.situacao === 'Confirmada').length;
    return {
      numeros: [
        { rotulo: 'Atividades no mês', valor: doMes.length, ...delta(doMes.length, atividadesDo(anterior).length) },
        { rotulo: 'Concluídas', valor: doMes.filter((a) => a.situacao === 'Concluída').length },
        { rotulo: 'Canceladas', valor: canceladas },
        { rotulo: 'Média de inscritos', valor: doMes.length ? Math.round(inscritos / doMes.length) : 0 },
      ],
      barras: { titulo: 'Atividades por mês', nome: 'atividades', dados: meses.map((p) => ({ rotulo: formatarMesCurto(p), valor: atividadesDo(p).length })) },
      rosca: { titulo: 'Atividades por tipo', nome: 'atividades', fatias: colorirCategorias(TIPOS_ATIVIDADE, contar(doMes.map((a) => a.tipo))) },
    };
  }

  if (aba === 'inscricoes') {
    const doMes = atividadesDo(periodo);
    const ids = new Set(doMes.map((a) => a.id));
    const todas = d.inscricoes.filter((i) => ids.has(i.atividadeId));
    const marcadas = todas.filter((i) => i.situacao === 'Confirmada' && i.presente !== null);
    const frequencia = marcadas.length ? Math.round((marcadas.filter((i) => i.presente).length / marcadas.length) * 100) : null;
    const vagas = doMes.reduce((s, a) => s + a.vagas, 0);
    const confirmadas = todas.filter((i) => i.situacao === 'Confirmada').length;
    return {
      numeros: [
        { rotulo: 'Inscrições no mês', valor: inscricoesDo(periodo).length, ...delta(inscricoesDo(periodo).length, inscricoesDo(anterior).length) },
        { rotulo: 'Lista de espera', valor: todas.filter((i) => i.situacao === 'Lista de espera').length },
        { rotulo: 'Frequência média', valor: frequencia === null ? '—' : `${frequencia}%` },
        { rotulo: 'Ocupação das vagas', valor: vagas ? `${Math.round((confirmadas / vagas) * 100)}%` : '—' },
      ],
      barras: {
        titulo: 'Frequência por atividade',
        nome: 'de presença',
        sufixo: '%',
        dados: doMes
          .map((a) => {
            const conf = d.inscricoes.filter((i) => i.atividadeId === a.id && i.situacao === 'Confirmada' && i.presente !== null);
            return { rotulo: a.titulo.length > 14 ? `${a.titulo.slice(0, 13)}…` : a.titulo, valor: conf.length ? Math.round((conf.filter((i) => i.presente).length / conf.length) * 100) : -1 };
          })
          .filter((x) => x.valor >= 0),
      },
      rosca: {
        titulo: 'Situação das inscrições',
        nome: 'inscrições',
        fatias: colorirCategorias(['Confirmada', 'Lista de espera', 'Cancelada'], contar(todas.map((i) => i.situacao))),
      },
    };
  }

  const demandas = d.demandas.filter((x) => x.criadaEm <= fim(periodo));
  const situacoes = demandas.map((x) => situacaoDemanda(x));
  return {
    numeros: [
      { rotulo: 'Abertas', valor: situacoes.filter((s) => s === 'Aberta').length },
      { rotulo: 'Em andamento', valor: situacoes.filter((s) => s === 'Em andamento').length },
      { rotulo: 'Concluídas', valor: situacoes.filter((s) => s === 'Concluída').length },
      { rotulo: 'Atrasadas', valor: situacoes.filter((s) => s === 'Atrasada').length },
    ],
    barras: {
      titulo: 'Demandas por categoria',
      nome: 'demandas',
      dados: CATEGORIAS_DEMANDA.map((c) => ({ rotulo: c, valor: demandas.filter((x) => x.categoria === c).length })).filter((x) => x.valor > 0),
    },
    rosca: { titulo: 'Demandas por prioridade', nome: 'demandas', fatias: colorirCategorias(PRIORIDADES, contar(demandas.map((x) => x.prioridade))) },
  };
}

const NOMES_ABA: Record<Aba, string> = {
  geral: 'Visão geral',
  membros: 'Membros',
  atividades: 'Atividades',
  inscricoes: 'Inscrições',
  demandas: 'Demandas',
};

export default function Indicadores() {
  const estado = useDados();
  const [periodo, setPeriodo] = useState(periodoAtual);
  const [aba, setAba] = useState<Aba>('geral');
  const [exportando, setExportando] = useState(false);

  const painel = useMemo(() => montarPainel(aba, periodo, estado), [aba, periodo, estado]);

  const exportar = async () => {
    setExportando(true);
    try {
      const tabelas: TabelaRelatorio[] = [
        { titulo: painel.barras.titulo, colunas: ['Item', 'Valor'], linhas: painel.barras.dados.map((x) => [x.rotulo, `${x.valor}${painel.barras.sufixo ?? ''}`]) },
        { titulo: painel.rosca.titulo, colunas: ['Item', 'Quantidade'], linhas: painel.rosca.fatias.map((f) => [f.rotulo, f.valor]) },
      ];
      await baixarRelatorio(
        {
          titulo: `Indicadores · ${NOMES_ABA[aba]}`,
          periodo,
          resumo: painel.numeros.map((n) => [n.rotulo, `${n.valor}${n.detalhe ? ` (${n.detalhe})` : ''}`]),
          tabelas,
        },
        'PDF',
        `sesfa-indicadores-${aba}-${periodo}`,
      );
      toast.success('Relatório exportado em PDF.');
    } catch {
      toast.error('Não foi possível gerar o PDF.');
    } finally {
      setExportando(false);
    }
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Relatórios e indicadores"
        subtitulo="Acompanhe os dados e gere relatórios do sistema."
        acoes={
          <>
            <MenuOpcoes rotulo={formatarMesAno(periodo)} valor={periodo} opcoes={opcoesDePeriodo()} aoMudar={setPeriodo} />
            <Botao icone={Download} onClick={exportar} disabled={exportando}>
              {exportando ? 'Gerando…' : 'Exportar relatório'}
            </Botao>
          </>
        }
      />

      <Abas<Aba>
        ativa={aba}
        aoMudar={setAba}
        itens={(Object.keys(NOMES_ABA) as Aba[]).map((id) => ({ id, rotulo: NOMES_ABA[id] }))}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {painel.numeros.map((n) => (
          <CartaoNumero
            key={n.rotulo}
            numeroAcima
            rotulo={n.rotulo}
            valor={n.valor}
            detalhe={n.detalhe}
            detalheClassName={clsx(n.positiva === false ? 'text-danger' : 'text-success')}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <CartaoComTitulo titulo={painel.barras.titulo}>
          <div className="pt-5">
            <GraficoBarras dados={painel.barras.dados} nomeValor={painel.barras.nome} sufixo={painel.barras.sufixo} />
          </div>
        </CartaoComTitulo>
        <CartaoComTitulo titulo={painel.rosca.titulo}>
          <div className="pt-6">
            <GraficoRosca fatias={painel.rosca.fatias} nomeValor={painel.rosca.nome} />
          </div>
        </CartaoComTitulo>
      </div>
    </>
  );
}
