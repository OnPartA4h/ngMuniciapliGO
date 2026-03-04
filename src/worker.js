// Worker pour gérer le routing d'une SPA Angular et la compression gzip
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Si la requête est pour voxel.wasm, servir le fichier compressé avec les bons headers
    if (url.pathname.endsWith('/voxel.wasm')) {
      // Essayer de récupérer le fichier .wasm.gz compressé
      const gzipUrl = new URL(url.pathname + '.gz', url.origin);
      const gzipRequest = new Request(gzipUrl, {
        method: request.method,
        headers: request.headers,
      });

      let response = await env.ASSETS.fetch(gzipRequest);

      if (response.status === 200) {
        // Créer une nouvelle réponse avec les bons en-têtes pour gzip
        const headers = new Headers(response.headers);
        headers.set('Content-Type', 'application/wasm');
        headers.set('Content-Encoding', 'gzip');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(response.body, {
          status: 200,
          statusText: response.statusText,
          headers: headers,
        });
      }
      // Si le .wasm.gz n'existe pas, essayer le .wasm normal
    }

    // Essayer de récupérer le fichier demandé
    let response = await env.ASSETS.fetch(request);

    // Si le fichier n'existe pas (404) et que ce n'est pas un fichier avec extension
    // rediriger vers index.html pour le routing Angular
    if (response.status === 404 && !url.pathname.includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    return response;
  },
};
