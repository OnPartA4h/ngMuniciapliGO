// Worker pour gérer le routing d'une SPA Angular et la compression gzip des fichiers Godot
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Intercepter TOUTES les requêtes vers des fichiers .wasm (quel que soit le sous-chemin)
    // Ex: /voxel.wasm ou /assets/godot/voxel.wasm
    if (url.pathname.endsWith('.wasm')) {
      // 1. Essayer d'abord de servir le .wasm normal (s'il existe)
      const wasmResponse = await env.ASSETS.fetch(request);
      if (wasmResponse.status === 200) {
        return wasmResponse;
      }

      // 2. Si le .wasm n'existe pas, essayer le .wasm.gz compressé :)
      const gzipUrl = new URL(url.pathname + '.gz', url.origin);
      const gzipResponse = await env.ASSETS.fetch(new Request(gzipUrl.toString(), request));

      if (gzipResponse.status === 200) {
        // Reconstruire la réponse avec les bons headers pour que le navigateur
        // décompresse automatiquement le gzip et traite le contenu comme du WASM
        const headers = new Headers(gzipResponse.headers);
        headers.set('Content-Type', 'application/wasm');
        headers.set('Content-Encoding', 'gzip');
        headers.delete('Content-Length'); // Le navigateur recalcule après décompression
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new Response(gzipResponse.body, {
          status: 200,
          statusText: 'OK',
          headers: headers,
        });
      }

      // 3. Ni .wasm ni .wasm.gz trouvé → 404
      return new Response('WebAssembly file not found', { status: 404 });
    }

    // Pour toutes les autres requêtes, essayer de récupérer le fichier statique
    let response = await env.ASSETS.fetch(request);

    // Si le fichier n'existe pas (404) et que ce n'est pas un fichier avec extension
    // → rediriger vers index.html pour le routing Angular (SPA fallback)
    if (response.status === 404 && !url.pathname.includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    return response;
  },
};
