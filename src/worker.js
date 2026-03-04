// Worker pour gérer le routing d'une SPA Angular et la compression gzip des fichiers Godot
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ─────────────────────────────────────────────────────────────────
    // CAS 1 : Le navigateur/Godot demande directement un .wasm.gz
    //   → on récupère le fichier depuis ASSETS et on REMPLACE les headers
    //     pour que le navigateur le décompresse et le traite comme du WASM.
    //   Note : on bypass le cache Cloudflare via Cache-Control: no-store
    //          sur la requête interne pour toujours passer par le worker.
    // ─────────────────────────────────────────────────────────────────
    if (url.pathname.endsWith('.wasm.gz')) {
      const assetRequest = new Request(request.url, {
        method: request.method,
        headers: request.headers,
      });
      const gzipResponse = await env.ASSETS.fetch(assetRequest);

      if (gzipResponse.status === 200) {
        const headers = new Headers(gzipResponse.headers);
        // Headers OBLIGATOIRES pour que le navigateur accepte le fichier comme WASM décompressé
        headers.set('Content-Type', 'application/wasm');
        headers.set('Content-Encoding', 'gzip');
        headers.delete('Content-Length'); // recalculé après décompression côté client
        // Empêcher Cloudflare de recacher la réponse avec de mauvais headers
        headers.set('Cache-Control', 'no-store');
        // Header de debug : permet de confirmer que le worker a traité la requête
        headers.set('X-Worker-Handled', 'wasm-gz');

        return new Response(gzipResponse.body, {
          status: 200,
          statusText: 'OK',
          headers,
        });
      }

      return new Response('WebAssembly GZ file not found', { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────
    // CAS 2 : Le navigateur demande un .wasm « normal »
    //   1. Essayer de servir le .wasm tel quel (s'il existe)
    //   2. Sinon, chercher le .wasm.gz et le reserver avec les bons headers
    // ─────────────────────────────────────────────────────────────────
    if (url.pathname.endsWith('.wasm')) {
      const wasmResponse = await env.ASSETS.fetch(request);
      if (wasmResponse.status === 200) {
        return wasmResponse;
      }

      // Fallback : essayer le .wasm.gz correspondant
      const gzipUrl = new URL(url.pathname + '.gz', url.origin);
      const gzipResponse = await env.ASSETS.fetch(new Request(gzipUrl.toString(), request));

      if (gzipResponse.status === 200) {
        const headers = new Headers(gzipResponse.headers);
        headers.set('Content-Type', 'application/wasm');
        headers.set('Content-Encoding', 'gzip');
        headers.delete('Content-Length');
        headers.set('Cache-Control', 'no-store');
        headers.set('X-Worker-Handled', 'wasm-fallback-gz');

        return new Response(gzipResponse.body, {
          status: 200,
          statusText: 'OK',
          headers,
        });
      }

      return new Response('WebAssembly file not found', { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────
    // CAS 3 : Toutes les autres requêtes → fichier statique ou SPA fallback
    // ─────────────────────────────────────────────────────────────────
    let response = await env.ASSETS.fetch(request);

    // SPA fallback : si la route n'existe pas et n'a pas d'extension → index.html
    if (response.status === 404 && !url.pathname.includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    return response;
  },
};
