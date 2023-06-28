import { formatBalance } from '@polkadot/util';

// TODO handle custom type
export function formatValue(type: string, value) {
  if (type.toLocaleLowerCase().includes('balance')) {
    // TODO Get decimals from chain

    return formatBalance(value, {
      decimals: 10,
      withSi: false,
      forceUnit: '-',
    }) as unknown as number;
  }

  return value;
}
