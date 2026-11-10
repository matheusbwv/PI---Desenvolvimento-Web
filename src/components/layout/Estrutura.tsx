import { ShieldX } from 'lucide-react';
import { Suspense, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { BotaoLink } from '@/components/ui/Botao';
import { usePode, useUsuarioAtual } from '@/store/acesso';
import type { Acao, Modulo } from '@/types';
import { MenuLateral } from './MenuLateral';
import { Topo } from './Topo';

/** Estrutura das telas internas: menu lateral + cabeçalho + conteúdo. Exige login. */
export function Estrutura() {
  const usuario = useUsuarioAtual();
  const local = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  if (!usuario || usuario.situacao === 'Inativo') {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }

  return (
    <div className="min-h-screen bg-page">
      <MenuLateral aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
      <div className="lg:pl-[240px]">
        <Topo aoAbrirMenu={() => setMenuAberto(true)} />
        <main className="px-4 py-6 sm:px-8 sm:py-7">
          <Suspense fallback={<Carregando />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function Carregando() {
  return (
    <div className="flex h-64 items-center justify-center text-[14px] text-muted" role="status">
      Carregando…
    </div>
  );
}

/** Mostra a tela só se o perfil do usuário tiver a permissão. */
export function ExigePermissao({ modulo, acao = 'visualizar', children }: { modulo: Modulo; acao?: Acao; children: ReactNode }) {
  const pode = usePode(modulo, acao);
  if (pode) return <>{children}</>;
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <ShieldX className="size-7" />
      </span>
      <h1 className="mt-4 text-[20px] font-bold text-ink">Acesso não permitido</h1>
      <p className="mt-2 text-[14px] text-muted">
        Seu perfil não tem permissão para acessar esta área. Fale com o administrador do sistema se precisar de acesso.
      </p>
      <BotaoLink to="/" variante="secundario" className="mt-6">
        Voltar ao início
      </BotaoLink>
    </div>
  );
}
