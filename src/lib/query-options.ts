export function paginationOptions(params: URLSearchParams) {
  const integer = (value: string | null, fallback: number, max: number) => {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? Math.min(number, max) : fallback;
  };
  const page = integer(params.get('page'), 1, 100_000);
  const pageSize = integer(params.get('pageSize'), 50, 100);
  // Filter grammar delimiters are not part of a name/username search.
  const search = (params.get('q') || '').slice(0,100).replace(/[,()%"\\]/g, ' ').trim();
  return { page, pageSize, from: (page-1)*pageSize, to: page*pageSize-1, search };
}
export function eventQueryOptions(params: URLSearchParams) {
  const view = params.get('view');
  return { ...paginationOptions(params), view: view === 'codes' || view === 'summary' ? view : 'roster' as 'roster' | 'codes' | 'summary' };
}
