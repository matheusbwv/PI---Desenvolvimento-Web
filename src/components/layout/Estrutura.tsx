import { ServerOff, ShieldX } from 'lucide-react';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Botao, BotaoLink } from '@/components/ui/Botao';
import { sair, usePode, useUsuarioAtual } from '@/store/acesso';
import { useDados } from '@/store/dados';
import { useSessao } from '@/store/sessao';
import type { Acao, Modulo } from '@/types';
import { MenuLateral } from './MenuLateral';
import { Topo } from './Topo';

/** Busca os dados no servidor ao entrar, ao voltar para a aba e a cada 30 segundos. */
function useSincronizarDados(token: string | null) {
  useEffect(() => {
    if (!token) return;
    const atualizar = () => void useDados.getState().carregar().catch(() => {});
    if (!useDados.getState().carregado) atualizar();
    const intervalo = window.setInterval(atualizar, 30_000);
    window.addEventListener('focus', atualizar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('focus', atualizar);
    };
  }, [token]);
}

/** Estrutura das telas internas: menu lateral + cabeçalho + conteúdo. Exige login. */
export function Estrutura() {
  const token = useSessao((s) => s.token);
  const carregado = useDados((s) => s.carregado);
  const erroCarga = useDados((s) => s.erroCarga);
  const usuario = useUsuarioAtual();
  const local = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  useSincronizarDados(token);

  if (!token) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  if (!carregado) return erroCarga ? <SemConexao mensagem={erroCarga} /> : <Carregando telaInteira />;
  // Usuário apagado ou desativado no meio da sessão: sai (e o login aparece).
  if (!usuario || usuario.situacao === 'Inativo') return <SessaoEncerrada />;

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

function SessaoEncerrada() {
  useEffect(() => sair(), []);
  return null;
}

function Carregando({ telaInteira = false }: { telaInteira?: boolean }) {
  return (
    <div className={`flex items-center justify-center text-[14px] text-muted ${telaInteira ? 'min-h-screen bg-page' : 'h-64'}`} role="status">
      Carregando…
    </div>
  );
}

/** Quando o servidor (API) não responde. */
function SemConexao({ mensagem }: { mensagem: string }) {
  const [tentando, setTentando] = useState(false);
  const tentarDeNovo = async () => {
    setTentando(true);
    await useDados.getState().carregar().catch(() => {});
    setTentando(false);
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning">
          <ServerOff className="size-7" />
        </span>
        <h1 className="mt-4 text-[20px] font-bold text-ink">Sem conexão com o servidor</h1>
        <p className="mt-2 text-[14px] text-muted">{mensagem}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Botao variante="secundario" onClick={sair}>
            Sair
          </Botao>
          <Botao onClick={tentarDeNovo} disabled={tentando}>
            {tentando ? 'Tentando…' : 'Tentar de novo'}
          </Botao>
        </div>
      </div>
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
