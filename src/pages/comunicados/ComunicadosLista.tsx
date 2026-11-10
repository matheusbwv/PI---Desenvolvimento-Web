import { CalendarDays, ClipboardCheck, Info, Pencil, Plus, Send, Trash2, TriangleAlert, UsersRound, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Abas } from '@/components/ui/Abas';
import { BotaoLink } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { CampoBusca } from '@/components/ui/Campos';
import { Cartao } from '@/components/ui/Cartao';
import { useConfirmar } from '@/components/ui/Janela';
import { MenuAcoes, MenuFiltros } from '@/components/ui/Menus';
import { Selo } from '@/components/ui/Selo';
import { Paginacao, usePaginacao } from '@/components/ui/Tabela';
import { contemTexto, formatarData } from '@/lib/formatacao';
import { CATEGORIAS_COMUNICADO } from '@/lib/opcoes';
import { tomCategoriaComunicado } from '@/lib/regras';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';
import type { CategoriaComunicado } from '@/types';

const ICONE_CATEGORIA: Record<CategoriaComunicado, LucideIcon> = {
  Evento: CalendarDays,
  Organização: UsersRound,
  Inscrições: ClipboardCheck,
  Aviso: TriangleAlert,
  Informativo: Info,
};

type Aba = 'todos' | 'Publicado' | 'Rascunho';

export default function ComunicadosLista() {
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const comunicados = useDados((s) => s.comunicados);
  const publicar = useDados((s) => s.publicarComunicado);
  const excluir = useDados((s) => s.excluirComunicado);
  const podeCriar = usePode('comunicados', 'criar');
  const podeEditar = usePode('comunicados', 'editar');
  const podeExcluir = usePode('comunicados', 'excluir');

  const [aba, setAba] = useState<Aba>('todos');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [publico, setPublico] = useState('');

  const publicos = [...new Set(comunicados.map((c) => c.publico))];
  const filtrados = useMemo(
    () =>
      comunicados
        .filter((c) => aba === 'todos' || c.situacao === aba)
        .filter((c) => !busca || contemTexto(c.titulo, busca) || contemTexto(c.mensagem, busca))
        .filter((c) => !categoria || c.categoria === categoria)
        .filter((c) => !publico || c.publico === publico)
        .sort((a, b) => (b.dataPublicacao || b.criadoEm).localeCompare(a.dataPublicacao || a.criadoEm)),
    [comunicados, aba, busca, categoria, publico],
  );
  const paginacao = usePaginacao(filtrados, 6);

  const pedirExclusao = async (id: string, titulo: string) => {
    const ok = await confirmar({
      titulo: 'Excluir comunicado?',
      mensagem: `"${titulo}" será excluído. Essa ação não pode ser desfeita.`,
      confirmar: 'Excluir',
      perigo: true,
    });
    if (!ok) return;
    excluir(id);
    toast.success('Comunicado excluído.');
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Comunicados"
        subtitulo="Publique e gerencie os comunicados da comunidade."
        acoes={
          podeCriar && (
            <BotaoLink to="/comunicados/novo" icone={Plus}>
              Novo comunicado
            </BotaoLink>
          )
        }
      />

      <Abas<Aba>
        ativa={aba}
        aoMudar={setAba}
        itens={[
          { id: 'todos', rotulo: 'Todos', contagem: comunicados.length },
          { id: 'Publicado', rotulo: 'Publicados', contagem: comunicados.filter((c) => c.situacao === 'Publicado').length },
          { id: 'Rascunho', rotulo: 'Rascunhos', contagem: comunicados.filter((c) => c.situacao === 'Rascunho').length },
        ]}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <CampoBusca
          className="w-full max-w-[620px]"
          placeholder="Pesquisar comunicados..."
          aria-label="Pesquisar comunicados"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <MenuFiltros
          secoes={[
            { id: 'categoria', rotulo: 'Categoria', valor: categoria, opcoes: CATEGORIAS_COMUNICADO, aoMudar: setCategoria },
            { id: 'publico', rotulo: 'Público-alvo', valor: publico, opcoes: publicos, aoMudar: setPublico },
          ]}
          aoLimpar={() => {
            setCategoria('');
            setPublico('');
          }}
        />
      </div>

      <Cartao className="overflow-hidden">
        {paginacao.paginados.length === 0 && (
          <p className="px-6 py-12 text-center text-[14px] text-muted">Nenhum comunicado encontrado.</p>
        )}
        <ul className="divide-y divide-line">
          {paginacao.paginados.map((c) => {
            const Icone = ICONE_CATEGORIA[c.categoria];
            return (
              <li key={c.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-subtle sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icone className="size-5" strokeWidth={1.9} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <Link to={`/comunicados/${c.id}/editar`} className="block truncate text-[14.5px] font-bold text-ink hover:text-primary">
                      {c.titulo}
                    </Link>
                    <p className="truncate text-[13.5px] text-muted">{c.mensagem}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 pl-14 sm:pl-0">
                  <Selo tom={tomCategoriaComunicado[c.categoria]}>{c.categoria}</Selo>
                  <Selo tom={c.situacao === 'Publicado' ? 'verde' : 'vermelho'}>{c.situacao}</Selo>
                  <span className="w-[84px] text-right text-[13.5px] text-muted">
                    {c.situacao === 'Publicado' ? formatarData(c.dataPublicacao) : '—'}
                  </span>
                  <MenuAcoes
                    rotulo={`Ações de ${c.titulo}`}
                    acoes={[
                      { rotulo: podeEditar ? 'Editar' : 'Ver comunicado', icone: Pencil, aoClicar: () => navegar(`/comunicados/${c.id}/editar`) },
                      {
                        rotulo: 'Publicar agora',
                        icone: Send,
                        oculto: !podeEditar || c.situacao === 'Publicado',
                        aoClicar: () => {
                          publicar(c.id);
                          toast.success('Comunicado publicado.');
                        },
                      },
                      { rotulo: 'Excluir', icone: Trash2, perigo: true, oculto: !podeExcluir, aoClicar: () => pedirExclusao(c.id, c.titulo) },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <Paginacao {...paginacao} rotulo="comunicados" />
      </Cartao>
    </>
  );
}
