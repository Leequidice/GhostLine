// Lightweight client helpers used by the UI for polling receipts and formatting
export function formatCliDeploy(classHash: string, salt: string | number, ctorArgs: string[]) {
  const saltArg = salt ? `--salt ${salt}` : '';
  const ctor = ctorArgs && ctorArgs.length ? `--constructor-args ${ctorArgs.join(' ')}` : '';
  return `starknet deploy --class-hash ${classHash} ${saltArg} ${ctor}`.trim();
}
