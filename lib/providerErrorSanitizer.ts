export function sanitizeProviderErrorBody(body: string): string {
  return body
    .slice(0, 200)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/("(?:api[_-]?key|authorization|client_secret|password|secret|token)"\s*:\s*)"[^"]*"/gi, '$1"***"')
    .replace(/('(?:api[_-]?key|authorization|client_secret|password|secret|token)'\s*:\s*)'[^']*'/gi, "$1'***'")
    .replace(/\b(api[_-]?key|authorization|client_secret|password|secret|token)=([^&\s]+)/gi, "$1=***")
    .replace(/\b(api[_-]?key|authorization|client_secret|password|secret|token):\s*[^\s,;}]+/gi, "$1: ***")
    .replace(/\b(sk|pk)_(live|test)_[A-Za-z0-9_=-]+/g, "$1_$2_***")
    .replace(/\bduffel_(live|test)_[A-Za-z0-9_=-]+/g, "duffel_$1_***");
}
