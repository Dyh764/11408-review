export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? "";
}

export function requireCronSecret(request: Request) {
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const providedSecret = request.headers.get("x-cron-secret") ?? readBearerToken(request);

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized cron request." }, 401);
  }

  return null;
}
