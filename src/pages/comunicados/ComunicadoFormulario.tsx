import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { AreaTexto, CaixaMarcacao, Campo, Entrada, Selecao } from '@/components/ui/Campos';
import { CartaoFormulario } from '@/components/ui/Formulario';
import { Selo } from '@/components/ui/Selo';
import { CATEGORIAS_COMUNICADO } from '@/lib/opcoes';
import NaoEncontrada from '@/pages/NaoEncontrada';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';
import type { CategoriaComunicado, SituacaoComunicado } from '@/types';

const esquema = z.object({
  titulo: z.string().trim().min(3, 'Informe o título do comunicado.'),
  categoria: z.string(),
  publico: z.string(),
  dataPublicacao: z.string(),
  mensagem: z.string().trim().min(10, 'Escreva a mensagem (mínimo de 10 caracteres).'),
  notificar: z.boolean(),
});
type Formulario = z.infer<typeof esquema>;

export default function ComunicadoFormulario() {
  const { id } = useParams();
  const navegar = useNavigate();
  const comunicado = useDados((s) => s.comunicados.find((c) => c.id === id));
  const grupos = useDados((s) => s.grupos);
  const salvar = useDados((s) => s.salvarComunicado);
  const podeEditar = usePode('comunicados', 'editar');
  const somenteLeitura = !!id && !podeEditar;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      titulo: comunicado?.titulo ?? '',
      categoria: comunicado?.categoria ?? '',
      publico: comunicado?.publico ?? 'Todos os membros',
      dataPublicacao: comunicado?.dataPublicacao ?? '',
      mensagem: comunicado?.mensagem ?? '',
      notificar: comunicado?.notificar ?? false,
    },
  });

  if (id && !comunicado) return <NaoEncontrada texto="Este comunicado não existe ou foi excluído." />;

  const publicos = ['Todos os membros', 'Coordenadores', ...grupos.filter((g) => g.situacao === 'Ativo').map((g) => `Grupo ${g.nome}`)];

  const salvarComo = (situacao: SituacaoComunicado) =>
    handleSubmit((dados) => {
      salvar(
        { ...dados, categoria: (dados.categoria || 'Informativo') as CategoriaComunicado, situacao },
        id,
      );
      toast.success(situacao === 'Publicado' ? 'Comunicado publicado.' : 'Rascunho salvo.');
      navegar('/comunicados');
    });

  const publicado = comunicado?.situacao === 'Publicado';

  return (
    <>
      <CabecalhoPagina
        titulo={id ? 'Editar comunicado' : 'Novo comunicado'}
        subtitulo="Escreva a mensagem e escolha quem vai receber."
        trilha={[{ rotulo: 'Comunicados', para: '/comunicados' }, { rotulo: id ? 'Editar' : 'Novo' }]}
        selo={comunicado && <Selo tom={publicado ? 'verde' : 'vermelho'}>{comunicado.situacao}</Selo>}
      />

      <CartaoFormulario
        aoEnviar={salvarComo('Publicado')}
        somenteLeitura={somenteLeitura}
        rodape={
          <>
            <Botao variante="secundario" onClick={() => navegar('/comunicados')}>
              {somenteLeitura ? 'Voltar' : 'Cancelar'}
            </Botao>
            {!somenteLeitura && (
              <>
                <Botao variante="secundario" onClick={salvarComo('Rascunho')}>
                  {publicado ? 'Mover para rascunho' : 'Salvar rascunho'}
                </Botao>
                <Botao type="submit">{publicado ? 'Salvar alterações' : 'Publicar'}</Botao>
              </>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <Campo rotulo="Título" obrigatorio htmlFor="titulo" erro={errors.titulo?.message}>
            <Entrada id="titulo" placeholder="Digite o título do comunicado" aria-invalid={!!errors.titulo} {...register('titulo')} />
          </Campo>
          <div className="grid gap-4 md:grid-cols-3">
            <Campo rotulo="Categoria" htmlFor="categoria">
              <Selecao id="categoria" placeholder="Selecione..." {...register('categoria')}>
                {CATEGORIAS_COMUNICADO.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Público-alvo" htmlFor="publico">
              <Selecao id="publico" {...register('publico')}>
                {publicos.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Data de publicação" htmlFor="dataPublicacao" dica="Em branco: usa a data de hoje ao publicar.">
              <Entrada id="dataPublicacao" type="date" {...register('dataPublicacao')} />
            </Campo>
          </div>
          <Campo rotulo="Mensagem" obrigatorio htmlFor="mensagem" erro={errors.mensagem?.message}>
            <AreaTexto
              id="mensagem"
              placeholder="Escreva a mensagem do comunicado"
              className="min-h-[180px]"
              aria-invalid={!!errors.mensagem}
              {...register('mensagem')}
            />
          </Campo>
          <CaixaMarcacao rotulo="Enviar notificação aos destinatários" {...register('notificar')} />
        </div>
      </CartaoFormulario>
    </>
  );
}
