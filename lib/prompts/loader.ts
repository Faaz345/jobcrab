/**
 * Prompt template loader — interpolates variables into prompt strings.
 */

/**
 * Replace {{variable}} placeholders in a template string.
 */
export function interpolate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}
