// Step 2 of the Decap CMS OAuth handshake: GitHub redirects here with a
// one-time `code`. We exchange it server-side for an access token (using
// GITHUB_OAUTH_CLIENT_SECRET, which never reaches the browser) and hand the
// token back to the Decap popup via postMessage, matching the protocol Decap
// expects from any "github" backend OAuth provider.
exports.handler = async (event) => {
  const code = event.queryStringParameters && event.queryStringParameters.code;
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!code) {
    return { statusCode: 400, body: "Missing code" };
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
  });
  const tokenData = await tokenRes.json();

  if (tokenData.error || !tokenData.access_token) {
    return { statusCode: 401, body: `OAuth error: ${tokenData.error_description || tokenData.error || "unknown"}` };
  }

  const payload = JSON.stringify({ token: tokenData.access_token, provider: "github" }).replace(/</g, "\\u003c");

  const html = `<!doctype html><html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage('authorization:github:success:${payload}', e.origin);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;

  return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
};
