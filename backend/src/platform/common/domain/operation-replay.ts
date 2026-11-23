import { ConflictException } from '@nestjs/common';

// A retried client operation must describe the same command that was first
// recorded; otherwise the stored result belongs to a different operation.
export function requireSameOperation(matches: boolean) {
  if (!matches)
    throw new ConflictException({
      code: 'operation-id-conflict',
      message:
        'El identificador de operación ya pertenece a otra operación. Genera uno nuevo.',
    });
}

export function sameMembers(left: readonly string[], right: readonly string[]) {
  const expected = new Set(left);
  return (
    expected.size === left.length &&
    new Set(right).size === right.length &&
    left.length === right.length &&
    right.every((value) => expected.has(value))
  );
}
