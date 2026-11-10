import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import ilustracao from '@/assets/ilustracao-comunidade.webp';
import { Logo } from '@/components/layout/Logo';
import { Botao } from '@/components/ui/Botao';
import { CaixaMarcacao, Campo, Entrada } from '@/components/ui/Campos';
import { autenticar, useUsuarioAtual } from '@/store/acesso';

const esquema = z.object({
  login: z.string().trim().min(1, 'Informe seu usuário ou e-mail.'),
  senha: z.string().min(1, 'Informe sua senha.'),
  lembrar: z.boolean(),
});
type DadosLogin = z.infer<typeof esquema>;

export default function Login() {
  const navegar = useNavigate();
  const local = useLocation();
  const usuario = useUsuarioAtual();
  const [verSenha, setVerSenha] = useState(false);
  const [erroGeral, setErroGeral] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosLogin>({
    resolver: zodResolver(esquema),
    defaultValues: { login: '', senha: '', lembrar: true },
  });

  const destino = (local.state as { de?: string } | null)?.de ?? '/';
  if (usuario && usuario.situacao === 'Ativo') return <Navigate to={destino} replace />;

  const entrar = (dados: DadosLogin) => {
    const resultado = autenticar(dados.login, dados.senha, dados.lembrar);
    if (!resultado.ok) {
      setErroGeral(resultado.erro);
      return;
    }
    navegar(destino, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eaf1fd_0%,#eff4fe_45%,#f7faff_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1440px] items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_440px] lg:px-24 xl:gap-24">
        <section className="hidden lg:block">
          <Logo grande />
          <h1 className="mt-14 max-w-[480px] text-[40px] leading-[1.2] font-bold tracking-tight text-brand xl:text-[44px]">
            Fortalecendo pessoas, grupos e territórios.
          </h1>
          <img
            src={ilustracao}
            alt="Pessoas da comunidade abraçadas em círculo"
            className="mt-8 w-full max-w-[600px] select-none"
            draggable={false}
          />
        </section>

        <section className="w-full">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo grande />
          </div>
          <div className="rounded-xl border border-line bg-white px-6 py-10 shadow-[0_20px_50px_-30px_rgba(15,60,140,0.35)] sm:px-10">
            <h2 className="text-[22px] font-bold tracking-tight text-ink">Bem-vindo(a) ao SESFA</h2>
            <p className="mt-1 text-[14px] text-muted">Entre com suas credenciais para acessar o sistema.</p>

            <form onSubmit={handleSubmit(entrar)} noValidate className="mt-7 space-y-5">
              {erroGeral && (
                <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13.5px] text-danger">
                  {erroGeral}
                </p>
              )}
              <Campo rotulo="Usuário ou e-mail" htmlFor="login" erro={errors.login?.message}>
                <Entrada
                  id="login"
                  autoComplete="username"
                  placeholder="exemplo@sesfa.org"
                  aria-invalid={!!errors.login}
                  className="h-11"
                  {...register('login', { onChange: () => setErroGeral('') })}
                />
              </Campo>
              <Campo rotulo="Senha" htmlFor="senha" erro={errors.senha?.message}>
                <div className="relative">
                  <Entrada
                    id="senha"
                    type={verSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={!!errors.senha}
                    className="h-11 pr-11"
                    {...register('senha', { onChange: () => setErroGeral('') })}
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha((v) => !v)}
                    aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}
                    className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted hover:text-ink"
                  >
                    {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Campo>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CaixaMarcacao rotulo="Lembrar de mim" {...register('lembrar')} />
                <button
                  type="button"
                  onClick={() =>
                    toast.info('Para redefinir sua senha, entre em contato com o administrador do sistema.')
                  }
                  className="cursor-pointer text-[14px] text-primary hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>
              <Botao type="submit" tamanho="lg" className="w-full" disabled={isSubmitting}>
                Entrar
              </Botao>
            </form>
            <p className="mt-6 text-center text-[13.5px] text-muted">Acesso restrito a usuários autorizados.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
