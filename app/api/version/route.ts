export const dynamic = "force-dynamic";

import packageJson from "@/package.json";
import { rateLimitResponse } from "@/lib/ratelimit";

/**
 * Returns the deployed git commit SHA so CI can poll until
 * the expected commit is live before running E2E tests.
 */
export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:version",
    limit: 180,
    windowSeconds: 60,
  });
  if (limited) return limited;

  return Response.json({
    app: packageJson.name,
    version: packageJson.version,
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    env: process.env.VERCEL_ENV ?? "local",
    deploymentUrl: process.env.VERCEL_URL ?? null,
    buildAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? null,
  });
}
