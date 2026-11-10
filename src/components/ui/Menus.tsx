import * as Menu from '@radix-ui/react-dropdown-menu';
import { clsx } from 'clsx';
import { Check, ChevronDown, MoreHorizontal, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { classesBotao } from './Botao';

const caixaMenu =
  'animar-surgir z-50 min-w-48 rounded-lg border border-line bg-white p-1 shadow-[0_10px_30px_-10px_rgba(22,35,59,0.25)]';
const itemMenu =
  'flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-3 text-[14px] text-ink outline-none data-[highlighted]:bg-page data-[disabled]:cursor-default data-[disabled]:opacity-40';

// ---------------------------------------------------------------- Menu "•••"
export interface AcaoMenu {
  rotulo: string;
  icone?: LucideIcon;
  aoClicar: () => void;
  perigo?: boolean;
  oculto?: boolean;
}

/** Botão "•••" da coluna Ações, com as opções da linha. */
export function MenuAcoes({ acoes, rotulo = 'Ações' }: { acoes: AcaoMenu[]; rotulo?: string }) {
  const visiveis = acoes.filter((a) => !a.oculto);
  if (visiveis.length === 0) return <span className="text-muted">—</span>;
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={rotulo}
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-page data-[state=open]:bg-page"
      >
        <MoreHorizontal className="size-5" strokeWidth={2.5} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={4} className={caixaMenu}>
          {visiveis.map(({ rotulo: texto, icone: Icone, aoClicar, perigo }) => (
            <Menu.Item key={texto} onSelect={aoClicar} className={clsx(itemMenu, perigo && 'text-danger')}>
              {Icone && <Icone className="size-4 opacity-80" aria-hidden />}
              {texto}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

// ---------------------------------------------------------------- Filtros
export interface OpcaoFiltro {
  valor: string;
  rotulo: string;
}

const normalizar = (opcoes: (string | OpcaoFiltro)[]): OpcaoFiltro[] =>
  opcoes.map((o) => (typeof o === 'string' ? { valor: o, rotulo: o } : o));

/** Botão "Situação ▾" que filtra por um valor (vazio = todos). */
export function FiltroSelecao({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  rotuloTodos = 'Todos',
}: {
  rotulo: string;
  valor: string;
  opcoes: (string | OpcaoFiltro)[];
  aoMudar: (valor: string) => void;
  rotuloTodos?: string;
}) {
  const lista = normalizar(opcoes);
  const selecionada = lista.find((o) => o.valor === valor);
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className={clsx(
          classesBotao('secundario', 'md', 'h-10 font-normal'),
          selecionada && 'border-primary/50 bg-primary-soft/50 text-brand',
        )}
      >
        {selecionada ? `${rotulo}: ${selecionada.rotulo}` : rotulo}
        <ChevronDown className="size-3.5 opacity-70" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={4} className={clsx(caixaMenu, 'max-h-80 overflow-y-auto')}>
          <Menu.RadioGroup value={valor} onValueChange={aoMudar}>
            {[{ valor: '', rotulo: rotuloTodos }, ...lista].map((o) => (
              <Menu.RadioItem key={o.valor || '_todos'} value={o.valor} className={itemMenu}>
                <span className="flex size-4 items-center justify-center">
                  <Menu.ItemIndicator>
                    <Check className="size-4 text-primary" />
                  </Menu.ItemIndicator>
                </span>
                {o.rotulo}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export interface SecaoFiltro {
  id: string;
  rotulo: string;
  valor: string;
  opcoes: (string | OpcaoFiltro)[];
  aoMudar: (valor: string) => void;
}

/** Botão "Filtros" com várias seções (ex.: Situação e Bairro). */
export function MenuFiltros({ secoes, aoLimpar }: { secoes: SecaoFiltro[]; aoLimpar: () => void }) {
  const ativos = secoes.filter((s) => s.valor).length;
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className={clsx(
          classesBotao('secundario', 'md', 'h-10'),
          ativos > 0 && 'border-primary/50 bg-primary-soft/50 text-brand',
        )}
      >
        <SlidersHorizontal className="size-4 opacity-70" aria-hidden />
        Filtros
        {ativos > 0 && (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-white">
            {ativos}
          </span>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="start" sideOffset={4} className={clsx(caixaMenu, 'max-h-[420px] w-60 overflow-y-auto')}>
          {secoes.map((secao, i) => (
            <div key={secao.id}>
              {i > 0 && <Menu.Separator className="my-1 h-px bg-line" />}
              <Menu.Label className="px-3 pt-2 pb-1 text-[12px] font-semibold tracking-wide text-muted uppercase">
                {secao.rotulo}
              </Menu.Label>
              <Menu.RadioGroup value={secao.valor} onValueChange={secao.aoMudar}>
                {[{ valor: '', rotulo: 'Todos' }, ...normalizar(secao.opcoes)].map((o) => (
                  <Menu.RadioItem
                    key={o.valor || '_todos'}
                    value={o.valor}
                    className={itemMenu}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <span className="flex size-4 items-center justify-center">
                      <Menu.ItemIndicator>
                        <Check className="size-4 text-primary" />
                      </Menu.ItemIndicator>
                    </span>
                    {o.rotulo}
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </div>
          ))}
          <Menu.Separator className="my-1 h-px bg-line" />
          <Menu.Item onSelect={aoLimpar} disabled={ativos === 0} className={clsx(itemMenu, 'justify-center text-primary')}>
            Limpar filtros
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

// ---------------------------------------------------------------- Lista suspensa genérica
/** Botão com lista de opções (ex.: seletor de mês "Outubro de 2026 ▾"). */
export function MenuOpcoes({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  alinhar = 'end',
}: {
  rotulo: ReactNode;
  valor: string;
  opcoes: OpcaoFiltro[];
  aoMudar: (valor: string) => void;
  alinhar?: 'start' | 'end';
}) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger className={classesBotao('secundario', 'md')}>
        {rotulo}
        <ChevronDown className="size-3.5 opacity-70" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align={alinhar} sideOffset={4} className={clsx(caixaMenu, 'max-h-80 overflow-y-auto')}>
          <Menu.RadioGroup value={valor} onValueChange={aoMudar}>
            {opcoes.map((o) => (
              <Menu.RadioItem key={o.valor} value={o.valor} className={itemMenu}>
                <span className="flex size-4 items-center justify-center">
                  <Menu.ItemIndicator>
                    <Check className="size-4 text-primary" />
                  </Menu.ItemIndicator>
                </span>
                {o.rotulo}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

export { Menu };
export const estilosMenu = { caixaMenu, itemMenu };
