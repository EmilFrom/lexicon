type NumberScale = { scale: number; symbol: 'M' | 'k'; decimal: number };

export function formatCount(plainNumber: number): string {
  const numberScales: Array<NumberScale> = [
    { scale: 1000000, symbol: 'M', decimal: 2 },
    { scale: 1000, symbol: 'k', decimal: 1 },
  ];

  for (const numberScale of numberScales) {
    const result = plainNumber / numberScale.scale;
    if (result >= 1) {
      return (
        result.toFixed(numberScale.decimal).replace(/\.?0+$/, '') +
        numberScale.symbol
      );
    }
  }

  return plainNumber.toString();
}
