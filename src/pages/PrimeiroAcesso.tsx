import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Botao } from '@/components/ui/Botao';
import { Campo, Entrada } from '@/components/ui/Campos';
import { criarPrimeiroAdministrador } from '@/store/acesso';

const esquema = z
  .object({
    nome: z.string().trim().min(3, 'Informe seu nome (mínimo de 3 letras).'),
    email: z.string().trim().regex(/^\S+@\S+\.\S+$/, 'Informe um e-mail válido.'),
    senha: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.'),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: 'As senhas não são iguais.', path: ['confirmacao'] });
type Formulario = z.infer<typeof esquema>;

/** Aparece no lugar do login enquanto o banco não tem nenhum usuário. */
export function PrimeiroAcesso({ aoConcluir }: { aoConcluir: () => void }) {
  const [erroGeral, setErroGeral] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nome: '', email: '', senha: '', confirmacao: '' },
  });

  const criar = async ({ nome, email, senha }: Formulario) => {
    const resultado = await criarPrimeiroAdministrador({ nome: nome.trim(), email: email.trim(), senha });
    if (!resultado.ok) return setErroGeral(resultado.erro);
    aoConcluir();
  };

  return (
    <>
      <h2 className="text-[22px] font-bold tracking-tight text-ink">Primeiro acesso</h2>
      <p className="mt-1 text-[14px] text-muted">
        O sistema ainda não tem usuários. Cadastre a conta do administrador: depois, ela cria as contas das outras pessoas.
      </p>

      <form onSubmit={handleSubmit(criar)} noValidate className="mt-7 space-y-5">
        {erroGeral && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13.5px] text-danger">
            {erroGeral}
          </p>
        )}
        <Campo rotulo="Nome completo" htmlFor="pa-nome" erro={errors.nome?.message}>
          <Entrada id="pa-nome" autoComplete="name" className="h-11" aria-invalid={!!errors.nome} {...register('nome')} />
        </Campo>
        <Campo rotulo="E-mail" htmlFor="pa-email" erro={errors.email?.message}>
          <Entrada
            id="pa-email"
            type="email"
            autoComplete="username"
            placeholder="nome@institutoelo.org"
            className="h-11"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Campo>
        <Campo rotulo="Senha" htmlFor="pa-senha" erro={errors.senha?.message}>
          <Entrada id="pa-senha" type="password" autoComplete="new-password" className="h-11" aria-invalid={!!errors.senha} {...register('senha')} />
        </Campo>
        <Campo rotulo="Confirme a senha" htmlFor="pa-confirmacao" erro={errors.confirmacao?.message}>
          <Entrada
            id="pa-confirmacao"
            type="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={!!errors.confirmacao}
            {...register('confirmacao')}
          />
        </Campo>
        <Botao type="submit" tamanho="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Criando conta…' : 'Criar conta de administrador'}
        </Botao>
      </form>
    </>
  );
}
