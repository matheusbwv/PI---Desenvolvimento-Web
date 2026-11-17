import { useSessao } from '@/store/sessao';

/** Erro devolvido pela API, já com a mensagem para mostrar ao usuário. */
export class ErroApi extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

export const mensagemDoErro = (erro: unknown) =>
  erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.';

async function requisitar(caminho: string, metodo: string, corpo?: unknown): Promise<Response> {
  const token = useSessao.getState().token;
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, 'Não foi possível falar com o servidor. Confira se ele está ligado.');
  }
  if (!resposta.ok) {
    const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
    // Token vencido ou usuário desativado: volta para o login.
    if (resposta.status === 401 && token) useSessao.getState().sair();
    throw new ErroApi(resposta.status, dados.erro ?? `O servidor respondeu com erro ${resposta.status}.`);
  }
  return resposta;
}

/** Chama a API e devolve o JSON da resposta. */
export async function chamarApi<T = void>(caminho: string, metodo = 'GET', corpo?: unknown): Promise<T> {
  const resposta = await requisitar(caminho, metodo, corpo);
  return (resposta.status === 204 ? undefined : await resposta.json()) as T;
}

/** Baixa um arquivo da API (com o token de acesso). */
export async function baixarDaApi(caminho: string): Promise<Blob> {
  return (await requisitar(caminho, 'GET')).blob();
}
