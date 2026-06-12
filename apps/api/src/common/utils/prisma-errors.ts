export function isMissingColumnError(err: unknown, column: string): boolean {
  const message = String((err as { message?: string })?.message ?? err ?? '');
  const code = String((err as { code?: string })?.code ?? '');
  return (
    code === 'P2022' ||
    message.includes(`\`${column}\``) ||
    message.includes(`column '${column}'`) ||
    message.includes(`Unknown column '${column}'`)
  );
}
