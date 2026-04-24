export const dynamic = "force-dynamic";

/**
 * Returns the deployed git commit SHA so CI can poll until
 * the expected commit is live before running E2E tests.
 */
export function GET() {
  return Response.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    env: process.env.VERCEL_ENV ?? "local",
  });
}
