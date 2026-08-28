export function webNotFoundResponseCreate(): Response {
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/png" href="/vw_static/vaultwarden-favicon.png">
    <title>Page not found!</title>
  </head>
  <body>
    <main>
      <h2>Page not found!</h2>
      <p>Sorry, but the page you were looking for could not be found.</p>
      <p><a href="/"><img src="/vw_static/404.png" alt="Return to the web vault?"></a></p>
      <p>You can <a href="/">return to the web-vault</a>, or <a href="https://github.com/dani-garcia/vaultwarden">contact us</a>.</p>
    </main>
    <footer>Vaultwarden (unofficial Bitwarden&reg; server)</footer>
  </body>
</html>`

  return new Response(body, {
    headers: { "cache-control": "no-store", "content-type": "text/html" },
    status: 404,
  })
}
