interface ExampleOptions {
  readonly label?: string;
}

const values: readonly string[] = ["foundation"];
const firstValue = values[0];
const options: ExampleOptions = firstValue === undefined ? {} : { label: firstValue };

export { options };
