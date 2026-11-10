import {
  addMonths,
  differenceInCalendarDays,
  differenceInMinutes,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Data de hoje no formato "aaaa-mm-dd" (horário local). */
export function hojeISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** "2026-10-25" -> "25/10/2026". Retorna "—" se vazio. */
export function formatarData(iso: string | undefined | null): string {
  if (!iso) return '—';
  return format(parseISO(iso), 'dd/MM/yyyy');
}

/** "2026-10-25" -> "25 out". */
export function formatarDiaMes(iso: string): string {
  return format(parseISO(iso), "d MMM", { locale: ptBR }).replace('.', '');
}

/** "2026-10" -> "Outubro de 2026". */
export function formatarMesAno(periodo: string): string {
  const texto = format(parseISO(`${periodo}-01`), "MMMM 'de' yyyy", { locale: ptBR });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "2026-10" -> "Out". */
export function formatarMesCurto(periodo: string): string {
  const texto = format(parseISO(`${periodo}-01`), 'MMM', { locale: ptBR }).replace('.', '');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function periodoAtual(): string {
  return format(new Date(), 'yyyy-MM');
}

/** Soma meses a um período "aaaa-mm". */
export function somarMeses(periodo: string, meses: number): string {
  return format(addMonths(parseISO(`${periodo}-01`), meses), 'yyyy-MM');
}

/** Lista de períodos "aaaa-mm" terminando no período informado. */
export function ultimosPeriodos(fim: string, quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) => somarMeses(fim, i - quantidade + 1));
}

/** Opções para o seletor de mês ("Outubro de 2026 ▾"), do mês atual para trás. */
export function opcoesDePeriodo(quantidade = 12): { valor: string; rotulo: string }[] {
  const atual = periodoAtual();
  return Array.from({ length: quantidade }, (_, i) => {
    const p = somarMeses(atual, -i);
    return { valor: p, rotulo: formatarMesAno(p) };
  });
}

export function limitesDoPeriodo(periodo: string): { inicio: string; fim: string } {
  const base = parseISO(`${periodo}-01`);
  return {
    inicio: format(startOfMonth(base), 'yyyy-MM-dd'),
    fim: format(endOfMonth(base), 'yyyy-MM-dd'),
  };
}

export function noPeriodo(dataISO: string, periodo: string): boolean {
  return dataISO.slice(0, 7) === periodo;
}

/** Tempo relativo em português: "há 10 minutos", "há 2 horas", "ontem", "há 3 dias". */
export function tempoRelativo(isoCompleto: string): string {
  const data = parseISO(isoCompleto);
  const agora = new Date();
  const minutos = differenceInMinutes(agora, data);
  if (minutos < 1) return 'agora mesmo';
  if (minutos < 60) return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  const horas = Math.floor(minutos / 60);
  if (isSameDay(agora, data) || horas < 6) {
    return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }
  const dias = differenceInCalendarDays(agora, data);
  if (dias <= 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return formatarData(isoCompleto.slice(0, 10));
}

/** Data e hora de último acesso: "Hoje, 08:12", "Ontem, 17:30" ou "25/10/2026". */
export function formatarUltimoAcesso(isoCompleto: string): string {
  if (!isoCompleto) return 'Nunca acessou';
  const data = parseISO(isoCompleto);
  const dias = differenceInCalendarDays(new Date(), data);
  if (dias === 0) return `Hoje, ${format(data, 'HH:mm')}`;
  if (dias === 1) return `Ontem, ${format(data, 'HH:mm')}`;
  return format(data, 'dd/MM/yyyy');
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Máscara de telefone brasileiro: (00) 00000-0000 ou (00) 0000-0000. */
export function mascararTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Iniciais para o avatar: "Usuário ADM" -> "ADM", "Ana Silva" -> "AS". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const ultima = partes[partes.length - 1] ?? '';
  if (partes.length > 1 && ultima === ultima.toUpperCase() && ultima.length <= 4) return ultima;
  return partes
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

/** Compara textos ignorando maiúsculas e acentos. */
export function contemTexto(texto: string, busca: string): boolean {
  const normalizar = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  return normalizar(texto).includes(normalizar(busca.trim()));
}

export function gerarId(): string {
  return crypto.randomUUID();
}

/** Variação percentual formatada: "+12%", "-5%" ou "—" quando não há base. */
export function variacaoPercentual(atual: number, anterior: number): { texto: string; positiva: boolean } {
  if (anterior === 0) return { texto: atual > 0 ? 'novo' : '—', positiva: true };
  const v = Math.round(((atual - anterior) / anterior) * 100);
  return { texto: `${v >= 0 ? '+' : ''}${v}%`, positiva: v >= 0 };
}
