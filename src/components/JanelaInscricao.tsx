import { useState } from 'react';
import { toast } from 'sonner';
import { Botao } from '@/components/ui/Botao';
import { Campo, Selecao } from '@/components/ui/Campos';
import { Janela } from '@/components/ui/Janela';
import { formatarData, hojeISO } from '@/lib/formatacao';
import { resumoVagas } from '@/lib/regras';
import { useDados } from '@/store/dados';

/** Janela "Inscrever membro": escolhe a atividade (se não vier fixa) e o membro. */
export function JanelaInscricao({
  aberta,
  aoMudar,
  atividadeFixa,
}: {
  aberta: boolean;
  aoMudar: (v: boolean) => void;
  atividadeFixa?: string;
}) {
  const atividades = useDados((s) => s.atividades);
  const membros = useDados((s) => s.membros);
  const inscricoes = useDados((s) => s.inscricoes);
  const inscrever = useDados((s) => s.inscrever);
  const [atividadeId, setAtividadeId] = useState(atividadeFixa ?? '');
  const [membroId, setMembroId] = useState('');
  const [erro, setErro] = useState('');

  const hoje = hojeISO();
  const abertas = atividades
    .filter((a) => a.data >= hoje && a.situacao !== 'Cancelada' && a.situacao !== 'Concluída')
    .sort((a, b) => a.data.localeCompare(b.data));
  const escolhida = atividades.find((a) => a.id === (atividadeFixa ?? atividadeId));
  const jaInscritos = new Set(
    inscricoes.filter((i) => i.atividadeId === escolhida?.id && i.situacao !== 'Cancelada').map((i) => i.membroId),
  );
  const disponiveis = membros
    .filter((m) => m.situacao === 'Ativo' && !jaInscritos.has(m.id))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const vagas = escolhida ? resumoVagas(escolhida, inscricoes) : null;

  const fechar = (v: boolean) => {
    aoMudar(v);
    if (!v) {
      setMembroId('');
      setErro('');
      if (!atividadeFixa) setAtividadeId('');
    }
  };

  const confirmar = () => {
    if (!escolhida) return setErro('Selecione a atividade.');
    if (!membroId) return setErro('Selecione o membro.');
    const resultado = inscrever(escolhida.id, membroId);
    if (!resultado.ok) return setErro(resultado.erro);
    if (resultado.mensagem?.includes('espera')) toast.warning(resultado.mensagem);
    else toast.success(resultado.mensagem ?? 'Inscrição realizada.');
    fechar(false);
  };

  return (
    <Janela
      aberta={aberta}
      aoMudar={fechar}
      titulo="Inscrever membro"
      descricao="Se não houver vagas, o membro entra automaticamente na lista de espera."
      rodape={
        <>
          <Botao variante="secundario" onClick={() => fechar(false)}>
            Cancelar
          </Botao>
          <Botao onClick={confirmar}>Inscrever</Botao>
        </>
      }
    >
      <div className="space-y-4">
        {erro && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-[13.5px] text-danger">
            {erro}
          </p>
        )}
        {!atividadeFixa && (
          <Campo rotulo="Atividade" obrigatorio htmlFor="insc-atividade">
            <Selecao
              id="insc-atividade"
              placeholder="Selecione..."
              value={atividadeId}
              onChange={(e) => {
                setAtividadeId(e.target.value);
                setErro('');
              }}
            >
              {abertas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.titulo} — {formatarData(a.data)}
                </option>
              ))}
            </Selecao>
          </Campo>
        )}
        {vagas && escolhida && (
          <p className="rounded-lg bg-page px-3.5 py-2.5 text-[13.5px] text-muted">
            {vagas.confirmadas} de {escolhida.vagas} vagas ocupadas
            {vagas.espera > 0 && ` · ${vagas.espera} na lista de espera`}
            {vagas.livres === 0 && ' · novas inscrições vão para a lista de espera'}
          </p>
        )}
        <Campo rotulo="Membro" obrigatorio htmlFor="insc-membro">
          <Selecao
            id="insc-membro"
            placeholder="Selecione..."
            value={membroId}
            onChange={(e) => {
              setMembroId(e.target.value);
              setErro('');
            }}
          >
            {disponiveis.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome} ({m.codigo})
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>
    </Janela>
  );
}
