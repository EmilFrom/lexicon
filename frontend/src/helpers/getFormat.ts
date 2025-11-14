export function getFormat(uri: string) {
  if (!uri) {
    return '';
  }
  
  const format = uri.match(/\.\w+$/);
  const modifiedFormat = format ? format[0].substring(1) : '';

  return modifiedFormat;
}
