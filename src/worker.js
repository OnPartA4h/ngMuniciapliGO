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
    
    return response;
  },
};
