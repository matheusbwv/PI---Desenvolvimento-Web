import { clsx } from 'clsx';
import {
  CalendarDays,
  ChartColumn,
  ChartPie,
  ClipboardCheck,
  FileText,
  FolderOpen,
  House,
  ListTodo,
  Megaphone,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { usePerfilAtual } from '@/store/acesso';
import type { Modulo } from '@/types';
import { Logo } from './Logo';

interface ItemMenu {
  para: string;
  rotulo: string;
  icone: LucideIcon;
  modulo?: Modulo;
  /** Outras rotas que também deixam o item marcado. */
  tambem?: string[];
  filhos?: { para: string; rotulo: string; icone: LucideIcon }[];
}

const ITENS: ItemMenu[] = [
  { para: '/', rotulo: 'Início', icone: House },
  { para: '/membros', rotulo: 'Membros', icone: UserRound, modulo: 'membros' },
  { para: '/grupos', rotulo: 'Grupos', icone: UsersRound, modulo: 'grupos' },
  { para: '/atividades', rotulo: 'Atividades', icone: CalendarDays, modulo: 'atividades' },
  { para: '/inscricoes', rotulo: 'Inscrições', icone: ClipboardCheck, modulo: 'inscricoes' },
  { para: '/comunicados', rotulo: 'Comunicados', icone: Megaphone, modulo: 'comunicados', tambem: ['/notificacoes'] },
  { para: '/demandas', rotulo: 'Demandas', icone: ListTodo, modulo: 'demandas' },
  {
    para: '/relatorios',
    rotulo: 'Relatórios',
    icone: ChartColumn,
    modulo: 'relatorios',
    filhos: [
      { para: '/relatorios', rotulo: 'Indicadores', icone: ChartPie },
      { para: '/relatorios/gerar', rotulo: 'Gerar relatórios', icone: FileText },
      { para: '/relatorios/documentos', rotulo: 'Documentos', icone: FolderOpen },
    ],
  },
  { para: '/administracao', rotulo: 'Administração', icone: ShieldCheck, modulo: 'administracao' },
];

function estaAtivo(caminho: string, item: ItemMenu) {
  if (item.para === '/') return caminho === '/';
  return [item.para, ...(item.tambem ?? [])].some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

export function MenuLateral({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { pathname } = useLocation();
  const perfil = usePerfilAtual();
  const visiveis = ITENS.filter((item) => !item.modulo || perfil?.permissoes[item.modulo]?.visualizar);

  return (
    <>
      {/* Fundo escuro no celular quando o menu está aberto */}
      <div
        onClick={aoFechar}
        className={clsx('fixed inset-0 z-30 bg-ink/40 transition-opacity lg:hidden', aberto ? 'opacity-100' : 'pointer-events-none opacity-0')}
        aria-hidden
      />
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-line bg-white transition-transform lg:translate-x-0',
          aberto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-[66px] shrink-0 items-center justify-between px-5">
          <Link to="/" onClick={aoFechar} aria-label="SESFA — página inicial">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar menu"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-page lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
          <ul className="space-y-1">
            {visiveis.map((item) => {
              const ativo = estaAtivo(pathname, item);
              const Icone = item.icone;
              return (
                <li key={item.para}>
                  <Link
                    to={item.para}
                    onClick={aoFechar}
                    aria-current={ativo ? 'page' : undefined}
                    className={clsx(
                      'flex h-10 items-center gap-3 rounded-lg px-2.5 text-[14.5px] transition-colors',
                      ativo ? 'bg-primary-soft font-medium text-brand' : 'text-ink hover:bg-page',
                    )}
                  >
                    <Icone className={clsx('size-[18px]', ativo ? 'text-primary' : 'text-icon')} strokeWidth={1.9} aria-hidden />
                    {item.rotulo}
                  </Link>
                  {item.filhos && ativo && (
                    <ul className="mt-1 mb-1 space-y-0.5">
                      {item.filhos.map((filho) => {
                        const filhoAtivo = pathname === filho.para;
                        const IconeFilho = filho.icone;
                        return (
                          <li key={filho.para}>
                            <Link
                              to={filho.para}
                              onClick={aoFechar}
                              aria-current={filhoAtivo ? 'page' : undefined}
                              className={clsx(
                                'flex h-9 items-center gap-2.5 rounded-lg pr-2.5 pl-[38px] text-[13.5px] transition-colors',
                                filhoAtivo ? 'font-semibold text-brand' : 'text-muted hover:bg-page hover:text-ink',
                              )}
                            >
                              <IconeFilho className="size-4" strokeWidth={1.9} aria-hidden />
                              {filho.rotulo}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
