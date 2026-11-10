import { Bell, LogOut, Menu as IconeMenu, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { estilosMenu, Menu } from '@/components/ui/Menus';
import { useConfirmar } from '@/components/ui/Janela';
import { iniciais } from '@/lib/formatacao';
import { limparArquivos } from '@/lib/arquivos';
import { usePerfilAtual, useUsuarioAtual } from '@/store/acesso';
import { useDados } from '@/store/dados';
import { useSessao } from '@/store/sessao';
import { BuscaGlobal } from './BuscaGlobal';

export function Topo({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const usuario = useUsuarioAtual();
  const perfil = usePerfilAtual();
  const naoLidas = useDados((s) => s.notificacoes.filter((n) => !n.lida).length);
  const restaurar = useDados((s) => s.restaurarExemplo);
  const sair = useSessao((s) => s.sair);

  const restaurarDados = async () => {
    const ok = await confirmar({
      titulo: 'Restaurar dados de exemplo?',
      mensagem: 'Todos os cadastros feitos no navegador serão apagados e os dados de exemplo voltarão ao estado inicial.',
      confirmar: 'Restaurar',
      perigo: true,
    });
    if (!ok) return;
    restaurar();
    await limparArquivos();
    toast.success('Dados de exemplo restaurados.');
    navegar('/');
  };

  return (
    <header className="sticky top-0 z-20 flex h-[66px] items-center gap-3 border-b border-line bg-white px-4 sm:px-8">
      <button
        type="button"
        onClick={aoAbrirMenu}
        aria-label="Abrir menu"
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-page lg:hidden"
      >
        <IconeMenu className="size-5" />
      </button>

      <BuscaGlobal />

      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => navegar('/notificacoes')}
          aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
          className="relative inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-icon hover:bg-page"
        >
          <Bell className="size-[19px]" strokeWidth={1.9} />
          {naoLidas > 0 && (
            <span className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-bold text-white">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>

        <Menu.Root modal={false}>
          <Menu.Trigger
            aria-label={`Menu do usuário ${usuario?.nome ?? ''}`}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg py-1 pr-1 pl-1 text-left hover:bg-page sm:pr-2"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
              {iniciais(usuario?.nome ?? '')}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-[13.5px] font-semibold text-ink">{usuario?.nome}</span>
              <span className="block text-[12px] text-muted">{perfil?.nome}</span>
            </span>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content align="end" sideOffset={6} className={estilosMenu.caixaMenu}>
              <div className="px-3 py-2">
                <p className="text-[13.5px] font-semibold text-ink">{usuario?.nome}</p>
                <p className="text-[12.5px] text-muted">{usuario?.email}</p>
              </div>
              <Menu.Separator className="my-1 h-px bg-line" />
              <Menu.Item onSelect={restaurarDados} className={estilosMenu.itemMenu}>
                <RotateCcw className="size-4 opacity-80" aria-hidden />
                Restaurar dados de exemplo
              </Menu.Item>
              <Menu.Item
                onSelect={() => {
                  sair();
                  navegar('/login');
                }}
                className={estilosMenu.itemMenu}
              >
                <LogOut className="size-4 opacity-80" aria-hidden />
                Sair
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </header>
  );
}
