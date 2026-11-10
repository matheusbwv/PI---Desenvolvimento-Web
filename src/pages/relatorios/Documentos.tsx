import { clsx } from 'clsx';
import { Download, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Botao } from '@/components/ui/Botao';
import { CabecalhoPagina } from '@/components/ui/CabecalhoPagina';
import { Campo, CampoBusca, Entrada, Selecao } from '@/components/ui/Campos';
import { Janela, useConfirmar } from '@/components/ui/Janela';
import { FiltroSelecao, MenuAcoes } from '@/components/ui/Menus';
import { Selo } from '@/components/ui/Selo';
import { LinhaVazia, Paginacao, Tabela, Td, Th, Tr, usePaginacao } from '@/components/ui/Tabela';
import { apagarArquivo, baixarBlob, lerArquivo, salvarArquivo } from '@/lib/arquivos';
import { contemTexto, formatarData, formatarTamanho, gerarId } from '@/lib/formatacao';
import { TAMANHO_MAXIMO_ARQUIVO } from '@/lib/opcoes';
import { tomArquivo } from '@/lib/regras';
import { usePode } from '@/store/acesso';
import { useDados } from '@/store/dados';
import type { Documento, TipoArquivo, VinculoDocumento } from '@/types';

const EXTENSOES: Record<string, TipoArquivo> = { pdf: 'PDF', docx: 'DOCX', xlsx: 'XLSX' };

/** Grande área do vínculo, usada no filtro "Vinculado a". */
function areaDoVinculo(v: VinculoDocumento): string {
  if (v.tipo === 'modulo') return v.rotulo;
  return { grupo: 'Grupos', atividade: 'Atividades', demanda: 'Demandas' }[v.tipo];
}

export default function Documentos() {
  const [parametros] = useSearchParams();
  const confirmar = useConfirmar();
  const documentos = useDados((s) => s.documentos);
  const excluir = useDados((s) => s.excluirDocumento);
  const podeEnviar = usePode('relatorios', 'criar');
  const podeExcluir = usePode('relatorios', 'excluir');
  const seletor = useRef<HTMLInputElement>(null);

  const [busca, setBusca] = useState(parametros.get('busca') ?? '');
  const [tipo, setTipo] = useState('');
  const [area, setArea] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);

  const filtrados = useMemo(
    () =>
      documentos
        .filter((d) => !busca || contemTexto(d.nome, busca))
        .filter((d) => !tipo || d.tipo === tipo)
        .filter((d) => !area || areaDoVinculo(d.vinculo) === area)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [documentos, busca, tipo, area],
  );
  const paginacao = usePaginacao(filtrados);

  const escolher = (lista: FileList | null) => {
    const f = lista?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!EXTENSOES[ext]) return toast.error('Formato não aceito. Envie arquivos PDF, DOCX ou XLSX.');
    if (f.size > TAMANHO_MAXIMO_ARQUIVO) return toast.error('O arquivo passa de 20 MB.');
    setArquivo(f);
  };

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    if (podeEnviar) escolher(e.dataTransfer.files);
  };

  const baixar = async (d: Documento) => {
    const blob = d.temArquivo ? await lerArquivo(d.id) : undefined;
    if (!blob) {
      toast.info('Este é um documento de exemplo, sem arquivo anexado. Envie um arquivo para testar o download.');
      return;
    }
    baixarBlob(blob, `${d.nome}.${d.tipo.toLowerCase()}`);
  };

  const pedirExclusao = async (d: Documento) => {
    const ok = await confirmar({ titulo: 'Excluir documento?', mensagem: `"${d.nome}" será excluído.`, confirmar: 'Excluir', perigo: true });
    if (!ok) return;
    excluir(d.id);
    await apagarArquivo(d.id);
    toast.success('Documento excluído.');
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Documentos"
        subtitulo="Armazene e organize os documentos da comunidade."
        acoes={
          podeEnviar && (
            <Botao icone={Upload} onClick={() => seletor.current?.click()}>
              Enviar documento
            </Botao>
          )
        }
      />

      <input
        ref={seletor}
        type="file"
        accept=".pdf,.docx,.xlsx"
        className="hidden"
        onChange={(e) => {
          escolher(e.target.files);
          e.target.value = '';
        }}
      />

      {podeEnviar && (
        <button
          type="button"
          onClick={() => seletor.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={soltar}
          className={clsx(
            'mb-5 flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-6 py-7 text-center text-[14px] transition-colors',
            arrastando ? 'border-primary bg-primary-soft/60 text-brand' : 'border-line-strong bg-white text-muted hover:border-primary/60',
          )}
        >
          <Upload className="mb-1 size-5" aria-hidden />
          Arraste arquivos aqui ou clique para selecionar · PDF, DOCX, XLSX até 20 MB
        </button>
      )}

      <div className="mb-5 flex flex-wrap gap-3">
        <CampoBusca
          className="w-full max-w-[420px]"
          placeholder="Pesquisar por nome do documento..."
          aria-label="Pesquisar documentos"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <FiltroSelecao rotulo="Tipo" valor={tipo} opcoes={['PDF', 'DOCX', 'XLSX']} aoMudar={setTipo} />
        <FiltroSelecao rotulo="Vinculado a" valor={area} opcoes={['Membros', 'Grupos', 'Atividades', 'Demandas']} aoMudar={setArea} />
      </div>

      <Tabela rodape={<Paginacao {...paginacao} rotulo="documentos" />}>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>Tipo</Th>
            <Th>Vinculado a</Th>
            <Th>Enviado por</Th>
            <Th>Data</Th>
            <Th>Tamanho</Th>
            <Th className="w-20">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {paginacao.paginados.length === 0 && <LinhaVazia colunas={7} texto="Nenhum documento encontrado." />}
          {paginacao.paginados.map((d) => (
            <Tr key={d.id}>
              <Td>{d.nome}</Td>
              <Td>
                <Selo tom={tomArquivo[d.tipo]}>{d.tipo}</Selo>
              </Td>
              <Td>{d.vinculo.rotulo}</Td>
              <Td className="whitespace-nowrap">{d.enviadoPor}</Td>
              <Td className="whitespace-nowrap">{formatarData(d.data)}</Td>
              <Td className="whitespace-nowrap">{formatarTamanho(d.tamanho)}</Td>
              <Td>
                <MenuAcoes
                  rotulo={`Ações de ${d.nome}`}
                  acoes={[
                    { rotulo: 'Baixar', icone: Download, aoClicar: () => baixar(d) },
                    { rotulo: 'Excluir', icone: Trash2, perigo: true, oculto: !podeExcluir, aoClicar: () => pedirExclusao(d) },
                  ]}
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Tabela>

      <JanelaEnvio arquivo={arquivo} aoFechar={() => setArquivo(null)} />
    </>
  );
}

function JanelaEnvio({ arquivo, aoFechar }: { arquivo: File | null; aoFechar: () => void }) {
  const grupos = useDados((s) => s.grupos);
  const atividades = useDados((s) => s.atividades);
  const demandas = useDados((s) => s.demandas);
  const adicionar = useDados((s) => s.adicionarDocumento);
  const [nome, setNome] = useState('');
  const [vinculo, setVinculo] = useState('modulo:membros');
  const [enviando, setEnviando] = useState(false);
  const [nomeDe, setNomeDe] = useState<File | null>(null);

  // Ao trocar de arquivo, sugere o nome sem a extensão.
  if (arquivo !== nomeDe) {
    setNomeDe(arquivo);
    setNome(arquivo ? arquivo.name.replace(/\.[^.]+$/, '') : '');
  }

  const opcoes: { grupo: string; itens: { valor: string; rotulo: string }[] }[] = [
    {
      grupo: 'Módulos',
      itens: ['Membros', 'Grupos', 'Atividades', 'Demandas'].map((m) => ({ valor: `modulo:${m.toLowerCase()}`, rotulo: m })),
    },
    { grupo: 'Grupos', itens: grupos.map((g) => ({ valor: `grupo:${g.id}`, rotulo: g.nome })) },
    {
      grupo: 'Atividades',
      itens: [...atividades].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 15).map((a) => ({ valor: `atividade:${a.id}`, rotulo: `${a.titulo} (${formatarData(a.data)})` })),
    },
    { grupo: 'Demandas', itens: demandas.map((d) => ({ valor: `demanda:${d.id}`, rotulo: `Demanda ${d.codigo}` })) },
  ];

  const enviar = async () => {
    if (!arquivo || nome.trim().length < 3) return;
    setEnviando(true);
    const [tipoVinculo, idVinculo] = vinculo.split(':') as [VinculoDocumento['tipo'], string];
    const rotulo = opcoes.flatMap((o) => o.itens).find((i) => i.valor === vinculo)?.rotulo.replace(/ \(.*\)$/, '') ?? '';
    const id = gerarId();
    try {
      await salvarArquivo(id, arquivo);
      adicionar(
        {
          nome: nome.trim(),
          tipo: EXTENSOES[arquivo.name.split('.').pop()!.toLowerCase()],
          vinculo: { tipo: tipoVinculo, id: idVinculo, rotulo },
          tamanho: arquivo.size,
          temArquivo: true,
        },
        id,
      );
      toast.success('Documento enviado.');
      aoFechar();
    } catch {
      toast.error('Não foi possível guardar o arquivo neste navegador.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Janela
      aberta={arquivo !== null}
      aoMudar={(v) => !v && aoFechar()}
      titulo="Enviar documento"
      descricao={arquivo ? `${arquivo.name} · ${formatarTamanho(arquivo.size)}` : undefined}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao onClick={enviar} disabled={enviando || nome.trim().length < 3}>
            {enviando ? 'Enviando…' : 'Enviar'}
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <Campo rotulo="Nome do documento" obrigatorio htmlFor="doc-nome" erro={nome.trim().length < 3 ? 'Mínimo de 3 letras.' : undefined}>
          <Entrada id="doc-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo rotulo="Vinculado a" htmlFor="doc-vinculo">
          <Selecao id="doc-vinculo" value={vinculo} onChange={(e) => setVinculo(e.target.value)}>
            {opcoes.map((o) => (
              <optgroup key={o.grupo} label={o.grupo}>
                {o.itens.map((i) => (
                  <option key={i.valor} value={i.valor}>
                    {i.rotulo}
                  </option>
                ))}
              </optgroup>
            ))}
          </Selecao>
        </Campo>
      </div>
    </Janela>
  );
}
