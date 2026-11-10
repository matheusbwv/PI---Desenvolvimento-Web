import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { AreaTexto, Campo, Entrada, SecaoFormulario, Selecao } from '@/components/ui/Campos';
import { CartaoFormulario } from '@/components/ui/Formulario';
import { BAIRROS, CATEGORIAS_DEMANDA, PRIORIDADES, SITUACOES_DEMANDA } from '@/lib/opcoes';
import NaoEncontrada from '@/pages/NaoEncontrada';
import { useDados } from '@/store/dados';
import type { Prioridade } from '@/types';

const esquema = z.object({
  titulo: z.string().trim().min(5, 'Informe o título da demanda (mínimo de 5 letras).'),
  categoria: z.string(),
  prioridade: z.string(),
  responsavelId: z.string(),
  prazo: z.string(),
  bairro: z.string(),
  grupoId: z.string(),
  situacao: z.enum(['Aberta', 'Em andamento', 'Concluída']),
  descricao: z.string().trim(),
});
type Formulario = z.infer<typeof esquema>;

export default function DemandaFormulario() {
  const { id } = useParams();
  const navegar = useNavigate();
  const demanda = useDados((s) => s.demandas.find((d) => d.id === id));
  const usuarios = useDados((s) => s.usuarios);
  const grupos = useDados((s) => s.grupos);
  const salvar = useDados((s) => s.salvarDemanda);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      titulo: demanda?.titulo ?? '',
      categoria: demanda?.categoria ?? '',
      prioridade: demanda?.prioridade ?? '',
      responsavelId: demanda?.responsavelId ?? '',
      prazo: demanda?.prazo ?? '',
      bairro: demanda?.bairro ?? '',
      grupoId: demanda?.grupoId ?? '',
      situacao: demanda?.situacao ?? 'Aberta',
      descricao: demanda?.descricao ?? '',
    },
  });

  if (id && !demanda) return <NaoEncontrada texto="Esta demanda não existe ou foi excluída." />;

  const voltar = () => navegar(id ? `/demandas/${id}` : '/demandas');
  const enviar = (dados: Formulario) => {
    const salva = salvar({ ...dados, prioridade: (dados.prioridade || 'Média') as Prioridade }, id);
    toast.success(id ? 'Alterações salvas.' : `Demanda ${salva.codigo} cadastrada.`);
    navegar(`/demandas/${salva.id}`);
  };

  return (
    <>
      <CabecalhoPagina
        titulo={id ? `Editar demanda ${demanda?.codigo}` : 'Cadastrar nova demanda'}
        subtitulo="Descreva a demanda e defina responsável e prazo."
        trilha={[{ rotulo: 'Demandas', para: '/demandas' }, { rotulo: id ? (demanda?.codigo ?? 'Editar') : 'Nova' }]}
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
        <SecaoFormulario titulo="Informações da demanda">
          <div className="grid gap-4 md:grid-cols-3">
            <Campo rotulo="Título" obrigatorio htmlFor="titulo" erro={errors.titulo?.message} className="md:col-span-2">
              <Entrada id="titulo" placeholder="Digite o título da demanda" aria-invalid={!!errors.titulo} {...register('titulo')} />
            </Campo>
            <Campo rotulo="Categoria" htmlFor="categoria">
              <Selecao id="categoria" placeholder="Selecione..." {...register('categoria')}>
                {CATEGORIAS_DEMANDA.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Prioridade" htmlFor="prioridade" dica="Em branco: Média.">
              <Selecao id="prioridade" placeholder="Selecione..." {...register('prioridade')}>
                {PRIORIDADES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Responsável" htmlFor="responsavelId">
              <Selecao id="responsavelId" placeholder="Selecione..." {...register('responsavelId')}>
                {usuarios
                  .filter((u) => u.situacao === 'Ativo' || u.id === demanda?.responsavelId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Prazo" htmlFor="prazo">
              <Entrada id="prazo" type="date" {...register('prazo')} />
            </Campo>
            <Campo rotulo="Território/Bairro" htmlFor="bairro">
              <Selecao id="bairro" placeholder="Selecione..." {...register('bairro')}>
                {BAIRROS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Grupo relacionado" htmlFor="grupoId">
              <Selecao id="grupoId" placeholder="Selecione..." {...register('grupoId')}>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Situação" htmlFor="situacao">
              <Selecao id="situacao" {...register('situacao')}>
                {SITUACOES_DEMANDA.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Selecao>
            </Campo>
          </div>
          <Campo rotulo="Descrição" htmlFor="descricao">
            <AreaTexto id="descricao" placeholder="Descreva a demanda com detalhes" className="min-h-[130px]" {...register('descricao')} />
          </Campo>
        </SecaoFormulario>
      </CartaoFormulario>
    </>
  );
}
