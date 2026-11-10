import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Ordem fixa das cores das categorias (validada para daltonismo).
// "Outros" sempre usa o cinza neutro.
export const CORES_CATEGORIAS = ['#1565d8', '#10b981', '#8b5cf6', '#f59e0b'];
export const COR_OUTROS = '#cbd5e1';

export interface Fatia {
  rotulo: string;
  valor: number;
  cor: string;
}

/**
 * Dá cor a cada categoria pela posição FIXA dela em `ordem` (e não pelo tamanho),
 * para a cor não mudar quando o filtro muda. O que passar de 4 vira "Outros".
 */
export function colorirCategorias(ordem: string[], contagem: Map<string, number>): Fatia[] {
  const principais = ordem.slice(0, CORES_CATEGORIAS.length);
  const fatias: Fatia[] = principais.map((rotulo, i) => ({ rotulo, valor: contagem.get(rotulo) ?? 0, cor: CORES_CATEGORIAS[i] }));
  const outros = [...contagem.entries()].filter(([rotulo]) => !principais.includes(rotulo)).reduce((s, [, n]) => s + n, 0);
  if (outros > 0) fatias.push({ rotulo: 'Outros', valor: outros, cor: COR_OUTROS });
  return fatias.filter((f) => f.valor > 0);
}

function CaixaDica({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-[0_8px_20px_-10px_rgba(22,35,59,0.3)]">
      <p className="text-[12.5px] text-muted">{titulo}</p>
      <p className="text-[14px] font-semibold text-ink">{valor}</p>
    </div>
  );
}

/** Barras verticais de uma série (ex.: participação por mês). */
export function GraficoBarras({
  dados,
  nomeValor,
  sufixo = '',
  altura = 280,
}: {
  dados: { rotulo: string; valor: number }[];
  nomeValor: string;
  sufixo?: string;
  altura?: number;
}) {
  if (dados.length === 0 || dados.every((d) => d.valor === 0)) {
    return <p className="flex items-center justify-center text-[14px] text-muted" style={{ height: altura }}>Sem dados no período.</p>;
  }
  return (
    <>
      <div style={{ height: altura }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#e3e8f0" />
            <XAxis dataKey="rotulo" tickLine={false} axisLine={{ stroke: '#e3e8f0' }} tick={{ fill: '#64748b', fontSize: 12.5 }} interval={0} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} width={40} />
            <Tooltip
              cursor={{ fill: '#f4f7fb' }}
              content={({ active, payload, label }) =>
                active && payload?.length ? <CaixaDica titulo={String(label)} valor={`${payload[0].value}${sufixo} ${nomeValor}`} /> : null
              }
            />
            <Bar dataKey="valor" fill="#1565d8" radius={[4, 4, 0, 0]} maxBarSize={56} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TabelaAcessivel titulo={nomeValor} linhas={dados.map((d) => [d.rotulo, `${d.valor}${sufixo}`])} />
    </>
  );
}

/** Rosca com legenda ao lado (ex.: membros por território). */
export function GraficoRosca({ fatias, nomeValor }: { fatias: Fatia[]; nomeValor: string }) {
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  if (total === 0) return <p className="flex h-[220px] items-center justify-center text-[14px] text-muted">Sem dados no período.</p>;
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="size-[200px] shrink-0" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={fatias}
              dataKey="valor"
              nameKey="rotulo"
              innerRadius="56%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {fatias.map((f) => (
                <Cell key={f.rotulo} fill={f.cor} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <CaixaDica titulo={String(payload[0].name)} valor={`${payload[0].value} ${nomeValor} (${pct(Number(payload[0].value))})`} />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2.5">
        {fatias.map((f) => (
          <li key={f.rotulo} className="flex items-center gap-2.5 text-[14px] whitespace-nowrap text-ink">
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: f.cor }} aria-hidden />
            <span>
              {f.rotulo} <span className="font-semibold">{pct(f.valor)}</span>
              <span className="text-muted"> · {f.valor}</span>
            </span>
          </li>
        ))}
      </ul>
      <TabelaAcessivel titulo={nomeValor} linhas={fatias.map((f) => [f.rotulo, `${f.valor} (${pct(f.valor)})`])} />
    </div>
  );
}

/** Tabela invisível na tela, lida por leitores de tela (o gráfico em si fica oculto para eles). */
function TabelaAcessivel({ titulo, linhas }: { titulo: string; linhas: string[][] }) {
  return (
    <table className="sr-only">
      <caption>{titulo}</caption>
      <tbody>
        {linhas.map(([a, b]) => (
          <tr key={a}>
            <th scope="row">{a}</th>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
