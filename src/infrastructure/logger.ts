export type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
}

/** One JSON line per event, readable in the Actions log and by any log tooling. */
export const jsonLogger: Logger = {
  info: (event, fields = {}) => console.log(JSON.stringify({ level: "info", event, ...fields })),
  warn: (event, fields = {}) => console.warn(JSON.stringify({ level: "warn", event, ...fields })),
};
