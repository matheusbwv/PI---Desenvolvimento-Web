import { SearchX } from 'lucide-react';
import { BotaoLink } from '@/components/ui/Botao';

export default function NaoEncontrada({ texto = 'A página que você procurou não existe ou foi removida.' }: { texto?: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <SearchX className="size-7" />
      </span>
      <h1 className="mt-4 text-[20px] font-bold text-ink">Não encontrado</h1>
      <p className="mt-2 text-[14px] text-muted">{texto}</p>
      <BotaoLink to="/" variante="secundario" className="mt-6">
        Voltar ao início
      </BotaoLink>
    </div>
  );
}
