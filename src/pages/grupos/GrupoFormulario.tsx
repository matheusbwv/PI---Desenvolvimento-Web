import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { AreaTexto, Campo, Entrada, SecaoFormulario, Selecao } from '@/components/ui/Campos';
import { CartaoFormulario } from '@/components/ui/Formulario';
import { hojeISO } from '@/lib/formatacao';
import { BAIRROS, MUNICIPIOS, SITUACOES_CADASTRO } from '@/lib/opcoes';
import NaoEncontrada from '@/pages/NaoEncontrada';
import { useDados } from '@/store/dados';

const esquema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome do grupo (mínimo de 3 letras).'),
  responsavelId: z.string().min(1, 'Selecione o responsável.'),
  objetivo: z.string().trim().max(400, 'Use no máximo 400 caracteres.'),
  municipio: z.string(),
  bairro: z.string(),
  criadoEm: z.string(),
  situacao: z.enum(['Ativo', 'Inativo']),
});
type Formulario = z.infer<typeof esquema>;

export default function GrupoFormulario() {
  const { id } = useParams();
  const navegar = useNavigate();
  const grupo = useDados((s) => s.grupos.find((g) => g.id === id));
  const usuarios = useDados((s) => s.usuarios);
  const salvar = useDados((s) => s.salvarGrupo);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nome: grupo?.nome ?? '',
      responsavelId: grupo?.responsavelId ?? '',
      objetivo: grupo?.objetivo ?? '',
      municipio: grupo?.municipio ?? '',
      bairro: grupo?.bairro ?? '',
      criadoEm: grupo?.criadoEm ?? hojeISO(),
      situacao: grupo?.situacao ?? 'Ativo',
    },
  });

  if (id && !grupo) return <NaoEncontrada texto="Este grupo não existe ou foi excluído." />;

  const voltar = () => navegar(id ? `/grupos/${id}` : '/grupos');
  const enviar = (dados: Formulario) => {
    const salvo = salvar({ ...dados, criadoEm: dados.criadoEm || hojeISO() }, id);
    toast.success(id ? 'Alterações salvas.' : 'Grupo cadastrado com sucesso.');
    navegar(`/grupos/${salvo.id}`);
  };

  const responsaveis = usuarios.filter((u) => u.situacao === 'Ativo' || u.id === grupo?.responsavelId);

  return (
    <>
      <CabecalhoPagina
        titulo={id ? 'Editar grupo' : 'Cadastrar novo grupo'}
        subtitulo="Preencha os dados do grupo comunitário."
        trilha={[{ rotulo: 'Grupos', para: '/grupos' }, { rotulo: id ? 'Editar' : 'Novo' }]}
      />

      <CartaoFormulario
        aoEnviar={handleSubmit(enviar)}
        rodape={
          <>
            <Botao variante="secundario" onClick={voltar}>
              Cancelar
            </Botao>
            <Botao type="submit">Salvar</Botao>
          </>
        }
      >
        <SecaoFormulario titulo="Informações do grupo">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo rotulo="Nome do grupo" obrigatorio htmlFor="nome" erro={errors.nome?.message}>
              <Entrada id="nome" placeholder="Digite o nome do grupo" aria-invalid={!!errors.nome} {...register('nome')} />
            </Campo>
            <Campo rotulo="Responsável" obrigatorio htmlFor="responsavelId" erro={errors.responsavelId?.message}>
              <Selecao id="responsavelId" placeholder="Selecione..." aria-invalid={!!errors.responsavelId} {...register('responsavelId')}>
                {responsaveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>
          <Campo rotulo="Objetivo" htmlFor="objetivo" erro={errors.objetivo?.message}>
            <AreaTexto id="objetivo" placeholder="Descreva o objetivo do grupo" {...register('objetivo')} />
          </Campo>
        </SecaoFormulario>

        <SecaoFormulario titulo="Território e situação">
          <div className="grid gap-4 md:grid-cols-3">
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
            <Campo rotulo="Data de criação" htmlFor="criadoEm">
              <Entrada id="criadoEm" type="date" max={hojeISO()} {...register('criadoEm')} />
            </Campo>
            <Campo rotulo="Situação" htmlFor="situacao">
              <Selecao id="situacao" {...register('situacao')}>
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
