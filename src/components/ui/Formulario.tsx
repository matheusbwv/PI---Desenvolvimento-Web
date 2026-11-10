import { Lock } from 'lucide-react';
import type { FormEventHandler, ReactNode } from 'react';
import { Cartao } from './Cartao';

/** Cartão branco dos formulários de cadastro, com os botões no rodapé. */
export function CartaoFormulario({
  aoEnviar,
  rodape,
  somenteLeitura = false,
  children,
}: {
  aoEnviar: FormEventHandler<HTMLFormElement>;
  rodape: ReactNode;
  somenteLeitura?: boolean;
  children: ReactNode;
}) {
  return (
    <Cartao className="max-w-[920px] p-6 sm:px-8 sm:py-7">
      {somenteLeitura && (
        <p className="mb-6 flex items-center gap-2 rounded-lg bg-page px-4 py-3 text-[13.5px] text-muted">
          <Lock className="size-4" aria-hidden />
          Seu perfil pode apenas visualizar este cadastro.
        </p>
      )}
      <form onSubmit={aoEnviar} noValidate>
        <fieldset disabled={somenteLeitura} className="min-w-0 space-y-7">
          {children}
        </fieldset>
        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-line pt-6">{rodape}</div>
      </form>
    </Cartao>
  );
}
