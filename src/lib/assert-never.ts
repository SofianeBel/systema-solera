export class UnreachableVariantError extends Error {
  readonly value: string;

  constructor(value: never) {
    const stringValue = String(value);
    super(`Unhandled variant: ${stringValue}`);
    this.name = "UnreachableVariantError";
    this.value = stringValue;
  }
}

export function assertNever(value: never): never {
  throw new UnreachableVariantError(value);
}
