import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { Toaster } from 'sonner';
import { Estrutura, ExigePermissao } from '@/components/layout/Estrutura';
import { ProvedorConfirmacao } from '@/components/ui/Janela';
import Login from '@/pages/Login';
import NaoEncontrada from '@/pages/NaoEncontrada';
import Painel from '@/pages/Painel';
import type { Acao, Modulo } from '@/types';

// As telas são carregadas sob demanda (deixa a primeira abertura mais rápida).
const MembrosLista = lazy(() => import('@/pages/membros/MembrosLista'));
const MembroFormulario = lazy(() => import('@/pages/membros/MembroFormulario'));
const GruposLista = lazy(() => import('@/pages/grupos/GruposLista'));
const GrupoFormulario = lazy(() => import('@/pages/grupos/GrupoFormulario'));
const GrupoDetalhes = lazy(() => import('@/pages/grupos/GrupoDetalhes'));
const Agenda = lazy(() => import('@/pages/atividades/Agenda'));
const AtividadeFormulario = lazy(() => import('@/pages/atividades/AtividadeFormulario'));
const AtividadeDetalhes = lazy(() => import('@/pages/atividades/AtividadeDetalhes'));
const Inscricoes = lazy(() => import('@/pages/inscricoes/Inscricoes'));
const ComunicadosLista = lazy(() => import('@/pages/comunicados/ComunicadosLista'));
const ComunicadoFormulario = lazy(() => import('@/pages/comunicados/ComunicadoFormulario'));
const Notificacoes = lazy(() => import('@/pages/Notificacoes'));
const DemandasLista = lazy(() => import('@/pages/demandas/DemandasLista'));
const DemandaFormulario = lazy(() => import('@/pages/demandas/DemandaFormulario'));
const DemandaDetalhes = lazy(() => import('@/pages/demandas/DemandaDetalhes'));
const Indicadores = lazy(() => import('@/pages/relatorios/Indicadores'));
const Relatorios = lazy(() => import('@/pages/relatorios/Relatorios'));
const Documentos = lazy(() => import('@/pages/relatorios/Documentos'));
const Usuarios = lazy(() => import('@/pages/administracao/Usuarios'));
const Perfis = lazy(() => import('@/pages/administracao/Perfis'));

/** Envolve a tela com a checagem de permissão do perfil. */
function protegida(Tela: LazyExoticComponent<ComponentType>, modulo: Modulo, acao: Acao = 'visualizar') {
  return (
    <ExigePermissao modulo={modulo} acao={acao}>
      <Tela />
    </ExigePermissao>
  );
}

const rotas = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <Estrutura />,
    children: [
      { index: true, element: <Painel /> },

      { path: 'membros', element: protegida(MembrosLista, 'membros') },
      { path: 'membros/novo', element: protegida(MembroFormulario, 'membros', 'criar') },
      { path: 'membros/:id/editar', element: protegida(MembroFormulario, 'membros') },

      { path: 'grupos', element: protegida(GruposLista, 'grupos') },
      { path: 'grupos/novo', element: protegida(GrupoFormulario, 'grupos', 'criar') },
      { path: 'grupos/:id', element: protegida(GrupoDetalhes, 'grupos') },
      { path: 'grupos/:id/editar', element: protegida(GrupoFormulario, 'grupos', 'editar') },

      { path: 'atividades', element: protegida(Agenda, 'atividades') },
      { path: 'atividades/nova', element: protegida(AtividadeFormulario, 'atividades', 'criar') },
      { path: 'atividades/:id', element: protegida(AtividadeDetalhes, 'atividades') },
      { path: 'atividades/:id/editar', element: protegida(AtividadeFormulario, 'atividades', 'editar') },

      { path: 'inscricoes', element: protegida(Inscricoes, 'inscricoes') },

      { path: 'comunicados', element: protegida(ComunicadosLista, 'comunicados') },
      { path: 'comunicados/novo', element: protegida(ComunicadoFormulario, 'comunicados', 'criar') },
      { path: 'comunicados/:id/editar', element: protegida(ComunicadoFormulario, 'comunicados') },
      { path: 'notificacoes', element: protegida(Notificacoes, 'comunicados') },

      { path: 'demandas', element: protegida(DemandasLista, 'demandas') },
      { path: 'demandas/nova', element: protegida(DemandaFormulario, 'demandas', 'criar') },
      { path: 'demandas/:id', element: protegida(DemandaDetalhes, 'demandas') },
      { path: 'demandas/:id/editar', element: protegida(DemandaFormulario, 'demandas', 'editar') },

      { path: 'relatorios', element: protegida(Indicadores, 'relatorios') },
      { path: 'relatorios/gerar', element: protegida(Relatorios, 'relatorios') },
      { path: 'relatorios/documentos', element: protegida(Documentos, 'relatorios') },

      { path: 'administracao', element: protegida(Usuarios, 'administracao') },
      { path: 'administracao/perfis', element: protegida(Perfis, 'administracao') },

      { path: '*', element: <NaoEncontrada /> },
    ],
  },
]);

export function App() {
  return (
    <ProvedorConfirmacao>
      <RouterProvider router={rotas} />
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </ProvedorConfirmacao>
  );
}
