import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Campo, Entrada, SecaoFormulario, Selecao } from '@/components/ui/Campos';
import { CartaoFormulario } from '@/components/ui/Formulario';
import { hojeISO, mascararTelefone } from '@/lib/formatacao';
import { BAIRROS, MUNICIPIOS, SITUACOES_CADASTRO } from '@/lib/opcoes';
import NaoEncontrada from '@/pages/NaoEncontrada';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';

const esquema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo (mínimo de 3 letras).'),
  nascimento: z.string().refine((v) => !v || v <= hojeISO(), 'A data de nascimento não pode estar no futuro.'),
  identificador: z.string().trim(),
  telefone: z.string().refine((v) => !v || v.replace(/\D/g, '').length >= 10, 'Telefone incompleto.'),
  email: z.string().trim().refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'E-mail inválido.'),
  municipio: z.string(),
  bairro: z.string(),
  situacao: z.string(),
});
type Formulario = z.infer<typeof esquema>;

export default function MembroFormulario() {
  const { id } = useParams();
  const navegar = useNavigate();
  const membro = useDados((s) => s.membros.find((m) => m.id === id));
  const salvar = useDados((s) => s.salvarMembro);
  const podeEditar = usePode('membros', 'editar');
  const somenteLeitura = !!id && !podeEditar;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: membro?.nome ?? '',
      nascimento: membro?.nascimento ?? '',
      identificador: membro?.identificador ?? '',
      telefone: membro?.telefone ?? '',
      email: membro?.email ?? '',
      municipio: membro?.municipio ?? '',
      bairro: membro?.bairro ?? '',
      situacao: membro?.situacao ?? '',
    },
  });

  if (id && !membro) return <NaoEncontrada texto="Este membro não existe ou foi excluído." />;

  const enviar = (dados: Formulario) => {
    salvar({ ...dados, situacao: dados.situacao === 'Inativo' ? 'Inativo' : 'Ativo' }, id);
    toast.success(id ? 'Alterações salvas.' : 'Membro cadastrado com sucesso.');
    navegar('/membros');
  };

  return (
    <>
      <CabecalhoPagina
        titulo={id ? 'Editar membro' : 'Cadastrar novo membro'}
        subtitulo={id ? `Código ${membro?.codigo} · atualize os dados do membro da comunidade.` : 'Preencha os dados do membro da comunidade.'}
        trilha={[{ rotulo: 'Membros', para: '/membros' }, { rotulo: id ? 'Editar' : 'Novo' }]}
      />

      <CartaoFormulario
        aoEnviar={handleSubmit(enviar)}
        somenteLeitura={somenteLeitura}
        rodape={
          <>
            <Botao variante="secundario" onClick={() => navegar('/membros')}>
              {somenteLeitura ? 'Voltar' : 'Cancelar'}
            </Botao>
            {!somenteLeitura && <Botao type="submit">Salvar</Botao>}
          </>
        }
      >
        <SecaoFormulario titulo="Dados pessoais">
          <div className="grid gap-4 md:grid-cols-3">
            <Campo rotulo="Nome completo" obrigatorio htmlFor="nome" erro={errors.nome?.message}>
              <Entrada id="nome" placeholder="Digite o nome completo" aria-invalid={!!errors.nome} {...register('nome')} />
            </Campo>
            <Campo rotulo="Data de nascimento" htmlFor="nascimento" erro={errors.nascimento?.message}>
              <Entrada id="nascimento" type="date" max={hojeISO()} aria-invalid={!!errors.nascimento} {...register('nascimento')} />
            </Campo>
            <Campo rotulo="Identificador (opcional)" htmlFor="identificador">
              <Entrada id="identificador" placeholder="Código interno" {...register('identificador')} />
            </Campo>
          </div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Contato">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo rotulo="Telefone" htmlFor="telefone" erro={errors.telefone?.message}>
              <Entrada
                id="telefone"
                type="tel"
                inputMode="numeric"
                placeholder="(00) 00000-0000"
                aria-invalid={!!errors.telefone}
                {...register('telefone', {
                  onChange: (e) => {
                    e.target.value = mascararTelefone(e.target.value);
                  },
                })}
              />
            </Campo>
            <Campo rotulo="E-mail" htmlFor="email" erro={errors.email?.message}>
              <Entrada id="email" type="email" placeholder="exemplo@email.com" aria-invalid={!!errors.email} {...register('email')} />
            </Campo>
          </div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Endereço">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo rotulo="Município" htmlFor="municipio">
              <Selecao id="municipio" placeholder="Selecione..." {...register('municipio')}>
                {MUNICIPIOS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Bairro" htmlFor="bairro">
              <Selecao id="bairro" placeholder="Selecione..." {...register('bairro')}>
                {BAIRROS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Situação de participação" htmlFor="situacao" dica="Se não escolher, o membro fica como Ativo.">
              <Selecao id="situacao" placeholder="Selecione..." {...register('situacao')}>
                {SITUACOES_CADASTRO.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Selecao>
            </Campo>
          </div>
        </SecaoFormulario>
      </CartaoFormulario>
    </>
  );
}
