import { clsx } from 'clsx';
import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BotaoLink } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Cartao } from '@/components/ui/Cartao';
import { MenuOpcoes } from '@/components/ui/Menus';
import { Selo, tons } from '@/components/ui/Selo';
import { LinhaVazia, Tabela, Td, Th, Tr } from '@/components/ui/Tabela';
import { formatarData, formatarDiaMes, formatarMesAno, hojeISO, periodoAtual, somarMeses } from '@/lib/formatacao';
import { origemAtividade, proximasAtividades, resumoVagas, tomAtividade } from '@/lib/regras';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Agenda() {
  const atividades = useDados((s) => s.atividades);
  const grupos = useDados((s) => s.grupos);
  const inscricoes = useDados((s) => s.inscricoes);
  const podeCriar = usePode('atividades', 'criar');
  const [periodo, setPeriodo] = useState(periodoAtual);
  const [visao, setVisao] = useState<'mes' | 'lista'>('mes');
  const hoje = hojeISO();

  const opcoesMes = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => somarMeses(periodoAtual(), i - 6)).map((p) => ({
        valor: p,
        rotulo: formatarMesAno(p),
      })),
    [],
  );

  const dias = useMemo(() => {
    const base = parseISO(`${periodo}-01`);
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(base)), end: endOfWeek(endOfMonth(base)) }).map((d) =>
      format(d, 'yyyy-MM-dd'),
    );
  }, [periodo]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, typeof atividades>();
    [...atividades]
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      .forEach((a) => mapa.set(a.data, [...(mapa.get(a.data) ?? []), a]));
    return mapa;
  }, [atividades]);

  const doMes = atividades
    .filter((a) => a.data.startsWith(periodo))
    .sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio));
  const proximas = proximasAtividades(atividades).slice(0, 5);

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda comunitária"
        subtitulo="Visualize as atividades e eventos por data."
        acoes={
          <>
            <MenuOpcoes rotulo={formatarMesAno(periodo)} valor={periodo} opcoes={opcoesMes} aoMudar={setPeriodo} />
            <MenuOpcoes
              rotulo={visao === 'mes' ? 'Mês' : 'Lista'}
              valor={visao}
              opcoes={[
                { valor: 'mes', rotulo: 'Mês' },
                { valor: 'lista', rotulo: 'Lista' },
              ]}
              aoMudar={(v) => setVisao(v as 'mes' | 'lista')}
            />
            {podeCriar && (
              <BotaoLink to="/atividades/nova" icone={Plus}>
                Nova atividade
              </BotaoLink>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        {visao === 'mes' ? (
          <Cartao className="overflow-hidden">
            <div className="overflow-x-auto">
              <div className="grid min-w-[640px] grid-cols-7">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="flex h-[38px] items-center border-b border-line px-3 text-[13.5px] text-muted">
                    {d}
                  </div>
                ))}
                {dias.map((dia, i) => {
                  const foraDoMes = !dia.startsWith(periodo);
                  const doDia = porDia.get(dia) ?? [];
                  const ehHoje = dia === hoje;
                  return (
                    <div
                      key={dia}
                      className={clsx(
                        'group relative min-h-[96px] border-line p-2',
                        i % 7 !== 6 && 'border-r',
                        i < dias.length - 7 && 'border-b',
                        foraDoMes && 'bg-subtle',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={clsx(
                            'inline-flex size-6 items-center justify-center rounded-full text-[13.5px]',
                            foraDoMes && 'text-placeholder',
                            ehHoje && 'bg-primary font-semibold text-white',
                          )}
                        >
                          {Number(dia.slice(8))}
                        </span>
                        {podeCriar && !foraDoMes && dia >= hoje && (
                          <Link
                            to={`/atividades/nova?data=${dia}`}
                            aria-label={`Nova atividade em ${formatarData(dia)}`}
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted opacity-0 group-hover:opacity-100 hover:bg-primary-soft hover:text-primary focus:opacity-100"
                          >
                            <Plus className="size-3.5" />
                          </Link>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        {doDia.slice(0, 2).map((a) => (
                          <Link
                            key={a.id}
                            to={`/atividades/${a.id}`}
                            title={`${a.titulo} · ${a.horaInicio} - ${a.horaFim}`}
                            className={clsx(
                              'block truncate rounded px-1.5 py-[3px] text-[12px] leading-4 hover:brightness-95',
                              tons[tomAtividade[a.situacao]],
                              a.situacao === 'Cancelada' && 'line-through',
                            )}
                          >
                            {a.titulo}
                          </Link>
                        ))}
                        {doDia.length > 2 && (
                          <p className="px-1.5 text-[12px] text-muted">+{doDia.length - 2} mais</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Cartao>
        ) : (
          <Tabela>
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Atividade</Th>
                <Th>Horário</Th>
                <Th>Local</Th>
                <Th>Inscritos</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {doMes.length === 0 && <LinhaVazia colunas={6} texto="Nenhuma atividade neste mês." />}
              {doMes.map((a) => (
                <Tr key={a.id}>
                  <Td className="whitespace-nowrap">{formatarData(a.data)}</Td>
                  <Td>
                    <Link to={`/atividades/${a.id}`} className="font-medium hover:text-primary hover:underline">
                      {a.titulo}
                    </Link>
                    <p className="text-[12.5px] text-muted">{origemAtividade(a, grupos)}</p>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {a.horaInicio} - {a.horaFim}
                  </Td>
                  <Td>{a.local || '—'}</Td>
                  <Td>
                    {resumoVagas(a, inscricoes).confirmadas}/{a.vagas}
                  </Td>
                  <Td>
                    <Selo tom={tomAtividade[a.situacao]}>{a.situacao}</Selo>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Tabela>
        )}

        <Cartao className="h-fit p-5">
          <h2 className="border-b border-line pb-3 text-[16px] font-bold text-ink">Próximas atividades</h2>
          {proximas.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-muted">Nenhuma atividade programada.</p>
          ) : (
            <ul className="divide-y divide-line">
              {proximas.map((a) => (
                <li key={a.id}>
                  <Link to={`/atividades/${a.id}`} className="-mx-2 block rounded-md px-2 py-3 hover:bg-subtle">
                    <p className="text-[14.5px] font-bold text-ink">{a.titulo}</p>
                    <p className="text-[13px] text-muted">
                      {formatarDiaMes(a.data)} · {a.horaInicio} - {a.horaFim}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  );
}
