import { clear, createStore, del, get, set } from 'idb-keyval';

// Os arquivos enviados em "Documentos" ficam guardados no próprio navegador (IndexedDB),
// porque o sistema não tem servidor.
const banco = createStore('sesfa-arquivos', 'arquivos');

export async function salvarArquivo(id: string, arquivo: Blob): Promise<void> {
  await set(id, arquivo, banco);
}

export async function lerArquivo(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, banco);
}

export async function apagarArquivo(id: string): Promise<void> {
  await del(id, banco);
}

export async function limparArquivos(): Promise<void> {
  try {
    await clear(banco);
  } catch {
    // navegador sem IndexedDB
  }
}

/** Faz o navegador baixar um arquivo. */
export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
