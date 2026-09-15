export const dynamic = "force-dynamic";

import packageJson from "@/package.json";

/**
 * Returns the deployed git commit SHA so CI can poll until
 * the expected commit is live before running E2E tests.
 */
export function GET() {
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
