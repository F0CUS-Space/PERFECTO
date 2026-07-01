/** True when DATABASE_URL is set — safe to call during Docker image build (no DB yet). */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return typeof url === "string" && url.length > 0;
}
