interface StrictOptions {
  readonly label?: string;
}

const values: readonly string[] = [];
const invalidIndexAccess: string = values[0];
const invalidOptionalProperty: StrictOptions = { label: undefined };
const invalidBrowserGlobal = document;

export { invalidBrowserGlobal, invalidIndexAccess, invalidOptionalProperty };
