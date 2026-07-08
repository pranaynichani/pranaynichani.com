// Step 1 of the Decap CMS OAuth handshake: send the editor to GitHub's
// authorize screen. GITHUB_OAUTH_CLIENT_ID is set as a Netlify env var.
exports.handler = async (event) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const host = event.headers["x-forwarded-host"] || event.headers.host;
  const proto = event.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${proto}://${host}/api/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo,user",
    redirect_uri: redirectUri
  });

  return {
    statusCode: 302,
    headers: { Location: `https://github.com/login/oauth/authorize?${params.toString()}` }
  };
};
