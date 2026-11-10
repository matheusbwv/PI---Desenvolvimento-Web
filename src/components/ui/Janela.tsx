import * as Dialog from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Botao } from './Botao';

/** Janela sobreposta (modal) com título, conteúdo e rodapé. */
export function Janela({
  aberta,
  aoMudar,
  titulo,
  descricao,
  children,
  rodape,
  largura = 'md',
}: {
  aberta: boolean;
  aoMudar: (aberta: boolean) => void;
  titulo: string;
  descricao?: string;
  children?: ReactNode;
  rodape?: ReactNode;
  largura?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Dialog.Root open={aberta} onOpenChange={aoMudar}>
      <Dialog.Portal>
        <Dialog.Overlay className="animar-aparecer fixed inset-0 z-50 bg-ink/40 backdrop-blur-[1px]" />
        <Dialog.Content
          className={clsx(
            'animar-surgir fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-2xl',
            largura === 'sm' && 'max-w-md',
            largura === 'md' && 'max-w-xl',
            largura === 'lg' && 'max-w-3xl',
          )}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-[18px] font-bold text-ink">{titulo}</Dialog.Title>
              {descricao ? (
                <Dialog.Description className="mt-1 text-[14px] text-muted">{descricao}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="-mt-1 -mr-2 inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-page hover:text-ink"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          {children}
          {rodape && <div className="mt-6 flex flex-wrap justify-end gap-2.5 border-t border-line pt-5">{rodape}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------- Confirmação
interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  confirmar?: string;
  perigo?: boolean;
}

type Confirmar = (opcoes: OpcoesConfirmacao) => Promise<boolean>;

const ContextoConfirmacao = createContext<Confirmar>(() => Promise.resolve(false));

/** Permite pedir confirmação de qualquer tela: `if (await confirmar({...})) ...` */
export function ProvedorConfirmacao({ children }: { children: ReactNode }) {
  const [opcoes, setOpcoes] = useState<OpcoesConfirmacao | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});

  const confirmar = useCallback<Confirmar>((novas) => {
    setOpcoes(novas);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const fechar = (resposta: boolean) => {
    resolver.current(resposta);
    setOpcoes(null);
  };

  return (
    <ContextoConfirmacao.Provider value={confirmar}>
      {children}
      <Dialog.Root open={opcoes !== null} onOpenChange={(aberta) => !aberta && fechar(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="animar-aparecer fixed inset-0 z-50 bg-ink/40" />
          <Dialog.Content className="animar-surgir fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex gap-4">
              {opcoes?.perigo && (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <TriangleAlert className="size-5" />
                </span>
              )}
              <div>
                <Dialog.Title className="text-[17px] font-bold text-ink">{opcoes?.titulo}</Dialog.Title>
                <Dialog.Description className="mt-1.5 text-[14px] text-muted">{opcoes?.mensagem}</Dialog.Description>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <Botao variante="secundario" onClick={() => fechar(false)}>
                Cancelar
              </Botao>
              <Botao
                variante="primario"
                className={opcoes?.perigo ? 'bg-danger hover:bg-danger/90' : undefined}
                onClick={() => fechar(true)}
                autoFocus
              >
                {opcoes?.confirmar ?? 'Confirmar'}
              </Botao>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ContextoConfirmacao.Provider>
  );
}

export function useConfirmar(): Confirmar {
  return useContext(ContextoConfirmacao);
}
