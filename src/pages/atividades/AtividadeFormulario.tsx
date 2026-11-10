import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { AreaTexto, Campo, Entrada, SecaoFormulario, Selecao } from '@/components/ui/Campos';
import { CartaoFormulario } from '@/components/ui/Formulario';
import { SITUACOES_ATIVIDADE, TIPOS_ATIVIDADE } from '@/lib/opcoes';
import { resumoVagas } from '@/lib/regras';
import NaoEncontrada from '@/pages/NaoEncontrada';
import { useDados } from '@/store/dados';

const esquema = z
  .object({
    titulo: z.string().trim().min(3, 'Informe o título (mínimo de 3 letras).'),
    tipo: z.enum(['Atividade do grupo', 'Organização interna', 'Evento comunitário']),
    grupoId: z.string(),
    data: z.string().min(1, 'Informe a data.'),
    horaInicio: z.string().min(1, 'Informe o horário de início.'),
    horaFim: z.string().min(1, 'Informe o horário de término.'),
    local: z.string().trim(),
    vagas: z.number({ error: 'Informe o número de vagas.' }).int('Use um número inteiro.').min(1, 'Mínimo de 1 vaga.').max(1000, 'Máximo de 1000 vagas.'),
    situacao: z.enum(['Em planejamento', 'Inscrições abertas', 'Confirmado', 'Concluída', 'Cancelada']),
    descricao: z.string().trim(),
  })
  .refine((d) => d.tipo !== 'Atividade do grupo' || d.grupoId !== '', {
    message: 'Selecione o grupo da atividade.',
    path: ['grupoId'],
  })
  .refine((d) => !d.horaInicio || !d.horaFim || d.horaFim > d.horaInicio, {
    message: 'O término deve ser depois do início.',
    path: ['horaFim'],
  });
type Formulario = z.infer<typeof esquema>;

export default function AtividadeFormulario() {
  const { id } = useParams();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const atividade = useDados((s) => s.atividades.find((a) => a.id === id));
  const grupos = useDados((s) => s.grupos);
  const inscricoes = useDados((s) => s.inscricoes);
  const salvar = useDados((s) => s.salvarAtividade);

  const grupoInicial = parametros.get('grupo') ?? '';
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: atividade
      ? { ...atividade }
      : {
          titulo: '',
          tipo: 'Atividade do grupo',
          grupoId: grupoInicial,
          data: parametros.get('data') ?? '',
          horaInicio: '',
          horaFim: '',
          local: '',
          vagas: 20,
          situacao: 'Em planejamento',
          descricao: '',
        },
  });

  if (id && !atividade) return <NaoEncontrada texto="Esta atividade não existe ou foi excluída." />;

  const tipo = watch('tipo');
  const gruposAtivos = grupos.filter((g) => g.situacao === 'Ativo' || g.id === atividade?.grupoId);

  const voltar = () => navegar(id ? `/atividades/${id}` : '/atividades');
  const enviar = (dados: Formulario) => {
    if (atividade) {
      const confirmadas = resumoVagas(atividade, inscricoes).confirmadas;
      if (dados.vagas < confirmadas) {
        setError('vagas', { message: `Já existem ${confirmadas} inscrições confirmadas.` });
        return;
      }
    }
    const salva = salvar({ ...dados, grupoId: dados.tipo === 'Atividade do grupo' ? dados.grupoId : '' }, id);
    toast.success(id ? 'Alterações salvas.' : 'Atividade cadastrada com sucesso.');
    navegar(`/atividades/${salva.id}`);
  };

  return (
    <>
      <CabecalhoPagina
        titulo={id ? 'Editar atividade' : 'Nova atividade'}
        subtitulo="Preencha os dados da atividade ou evento."
        trilha={[{ rotulo: 'Atividades', para: '/atividades' }, { rotulo: id ? 'Editar' : 'Nova' }]}
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
        <SecaoFormulario titulo="Informações da atividade">
          <div className="grid gap-4 md:grid-cols-3">
            <Campo rotulo="Título" obrigatorio htmlFor="titulo" erro={errors.titulo?.message} className="md:col-span-2">
              <Entrada id="titulo" placeholder="Digite o título da atividade" aria-invalid={!!errors.titulo} {...register('titulo')} />
            </Campo>
            <Campo rotulo="Tipo" obrigatorio htmlFor="tipo">
              <Selecao id="tipo" {...register('tipo')}>
                {TIPOS_ATIVIDADE.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Selecao>
            </Campo>
            {tipo === 'Atividade do grupo' && (
              <Campo rotulo="Grupo" obrigatorio htmlFor="grupoId" erro={errors.grupoId?.message}>
                <Selecao id="grupoId" placeholder="Selecione..." aria-invalid={!!errors.grupoId} {...register('grupoId')}>
                  {gruposAtivos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            )}
            <Campo rotulo="Local" htmlFor="local" className={tipo === 'Atividade do grupo' ? 'md:col-span-2' : 'md:col-span-3'}>
              <Entrada id="local" placeholder="Ex.: Centro Comunitário" {...register('local')} />
            </Campo>
          </div>
        </SecaoFormulario>

        <SecaoFormulario titulo="Data, horário e vagas">
          <div className="grid gap-4 md:grid-cols-3">
            <Campo rotulo="Data" obrigatorio htmlFor="data" erro={errors.data?.message}>
              <Entrada id="data" type="date" aria-invalid={!!errors.data} {...register('data')} />
            </Campo>
            <Campo rotulo="Início" obrigatorio htmlFor="horaInicio" erro={errors.horaInicio?.message}>
              <Entrada id="horaInicio" type="time" aria-invalid={!!errors.horaInicio} {...register('horaInicio')} />
            </Campo>
            <Campo rotulo="Término" obrigatorio htmlFor="horaFim" erro={errors.horaFim?.message}>
              <Entrada id="horaFim" type="time" aria-invalid={!!errors.horaFim} {...register('horaFim')} />
            </Campo>
            <Campo rotulo="Vagas" obrigatorio htmlFor="vagas" erro={errors.vagas?.message}>
              <Entrada id="vagas" type="number" min={1} aria-invalid={!!errors.vagas} {...register('vagas', { valueAsNumber: true })} />
            </Campo>
            <Campo rotulo="Situação" htmlFor="situacao">
              <Selecao id="situacao" {...register('situacao')}>
                {SITUACOES_ATIVIDADE.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Selecao>
            </Campo>
          </div>
          <Campo rotulo="Descrição" htmlFor="descricao">
            <AreaTexto id="descricao" placeholder="Descreva a atividade, o público e o que levar" {...register('descricao')} />
          </Campo>
        </SecaoFormulario>
      </CartaoFormulario>
    </>
  );
}
