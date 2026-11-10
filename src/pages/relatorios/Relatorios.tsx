import { CalendarDays, ClipboardCheck, ListTodo, UsersRound, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Cartao } from '@/components/ui/Cartao';
import { MenuOpcoes } from '@/components/ui/Menus';
import { Selo } from '@/components/ui/Selo';
import { LinhaVazia, Paginacao, Tabela, Td, Th, Tr, usePaginacao } from '@/components/ui/Tabela';
import { formatarData, formatarMesAno, opcoesDePeriodo, periodoAtual } from '@/lib/formatacao';
import { baixarRelatorio, montarRelatorio, TITULO_RELATORIO } from '@/lib/relatorios';
import { tomArquivo } from '@/lib/regras';
import { useDados } from '@/store/dados';
import type { FormatoRelatorio, RelatorioGerado, TipoRelatorio } from '@/types';

const MODELOS: { tipo: TipoRelatorio; titulo: string; descricao: string; icone: LucideIcon }[] = [
  { tipo: 'membros', titulo: 'Membros', descricao: 'Lista e situação dos membros por território.', icone: UsersRound },
  { tipo: 'atividades', titulo: 'Atividades', descricao: 'Atividades realizadas e participação.', icone: CalendarDays },
  { tipo: 'inscricoes', titulo: 'Inscrições e frequência', descricao: 'Vagas, inscritos e presença por sessão.', icone: ClipboardCheck },
  { tipo: 'demandas', titulo: 'Demandas', descricao: 'Demandas por situação, prioridade e prazo.', icone: ListTodo },
];

export default function Relatorios() {
  const relatorios = useDados((s) => s.relatorios);
  const registrar = useDados((s) => s.registrarRelatorio);
  const [periodo, setPeriodo] = useState(periodoAtual);
  const [formato, setFormato] = useState<FormatoRelatorio>('PDF');
  const [gerando, setGerando] = useState<string | null>(null);
  const paginacao = usePaginacao(relatorios);

  const gerarArquivo = async (r: Pick<RelatorioGerado, 'tipo' | 'periodo' | 'formato'>, chave: string) => {
    setGerando(chave);
    try {
      const conteudo = montarRelatorio(r.tipo, r.periodo, useDados.getState());
      await baixarRelatorio(conteudo, r.formato, `sesfa-${r.tipo}-${r.periodo}`);
      return true;
    } catch {
      toast.error('Não foi possível gerar o arquivo.');
      return false;
    } finally {
      setGerando(null);
    }
  };

  const gerar = async (tipo: TipoRelatorio) => {
    const ok = await gerarArquivo({ tipo, periodo, formato }, tipo);
    if (!ok) return;
    registrar({ tipo, periodo, formato });
    toast.success(`Relatório de ${TITULO_RELATORIO[tipo].toLowerCase()} gerado em ${formato}.`);
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Relatórios"
        subtitulo="Gere relatórios por período e exporte em PDF ou Excel."
        acoes={
          <>
            <MenuOpcoes rotulo={formatarMesAno(periodo)} valor={periodo} opcoes={opcoesDePeriodo()} aoMudar={setPeriodo} />
            <MenuOpcoes
              rotulo={formato}
              valor={formato}
              opcoes={[
                { valor: 'PDF', rotulo: 'PDF' },
                { valor: 'XLSX', rotulo: 'Excel (XLSX)' },
              ]}
              aoMudar={(v) => setFormato(v as FormatoRelatorio)}
            />
          </>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MODELOS.map(({ tipo, titulo, descricao, icone: Icone }) => (
          <Cartao key={tipo} className="flex flex-col p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icone className="size-5" strokeWidth={1.9} aria-hidden />
            </span>
            <h2 className="mt-4 text-[15.5px] font-bold text-ink">{titulo}</h2>
            <p className="mt-1 flex-1 text-[13.5px] text-muted">{descricao}</p>
            <Botao variante="contorno" tamanho="sm" className="mt-4 self-start" disabled={gerando !== null} onClick={() => gerar(tipo)}>
              {gerando === tipo ? 'Gerando…' : 'Gerar relatório'}
            </Botao>
          </Cartao>
        ))}
      </div>

      <h2 className="mb-3 text-[16px] font-bold text-ink">Relatórios gerados</h2>
      <Tabela rodape={<Paginacao {...paginacao} rotulo="relatórios" />}>
        <thead>
          <tr>
            <Th>Relatório</Th>
            <Th>Período</Th>
            <Th>Formato</Th>
            <Th>Gerado por</Th>
            <Th>Gerado em</Th>
            <Th className="w-28">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {paginacao.paginados.length === 0 && <LinhaVazia colunas={6} texto="Nenhum relatório gerado ainda." />}
          {paginacao.paginados.map((r) => (
            <Tr key={r.id}>
              <Td>{TITULO_RELATORIO[r.tipo]}</Td>
              <Td>{formatarMesAno(r.periodo)}</Td>
              <Td>
                <Selo tom={tomArquivo[r.formato]}>{r.formato}</Selo>
              </Td>
              <Td>{r.geradoPor}</Td>
              <Td>{formatarData(r.geradoEm.slice(0, 10))}</Td>
              <Td>
                <Botao variante="contorno" tamanho="sm" disabled={gerando !== null} onClick={() => gerarArquivo(r, r.id)}>
                  {gerando === r.id ? 'Gerando…' : 'Baixar'}
                </Botao>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Tabela>
    </>
  );
}
