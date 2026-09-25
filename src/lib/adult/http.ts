const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

export async function getHtml(
  url: string,
  headers?: Record<string, string>,
): Promise<{status: number; html: string}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...headers,
      },
    });
    const html = await res.text();
    return {status: res.status, html};
  } finally {
    clearTimeout(timeout);
  }
}

export function joinUrl(base: string, path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}
