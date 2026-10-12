export const sourceId = (path: string) => path.replace(/[/.]/g, "-");
export const sourceUrl = (path: string) => `/eye-source/${sourceId(path)}/`;
