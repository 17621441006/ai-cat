declare namespace Cloudflare {
  interface Env {
    OPENROUTER_API_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
