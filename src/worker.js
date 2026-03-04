// Worker pour gérer le routing d'une SPA Angular
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Essayer de récupérer le fichier demandé
    let response = await env.ASSETS.fetch(request);
    
    // Si le fichier n'existe pas (404) et que ce n'est pas un fichier avec extension
    // rediriger vers index.html pour le routing Angular
    if (response.status === 404 && !url.pathname.includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    // Fichiers .wasm.br : Godot exporte le WASM compressé en Brotli.
    // Le navigateur doit recevoir Content-Encoding: br pour le décompresser
    // automatiquement avant de le passer à WebAssembly.instantiateStreaming().
    if (url.pathname.endsWith('.wasm.br')) {
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'application/wasm');
      headers.set('Content-Encoding', 'br');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // Fichiers .pck (Godot game data) – s'assurer du bon Content-Type
    if (url.pathname.endsWith('.pck')) {
      const headers = new Headers(response.headers);
      headers.set('Content-Type', 'application/octet-stream');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // Headers Cross-Origin Isolation requis par Godot pour SharedArrayBuffer / threads
    if (url.pathname.includes('/assets/godot/')) {
      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
