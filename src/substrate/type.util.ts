import { formatBalance } from '@polkadot/util';

// TODO handle custom type
export function formatValue(type: string, value, decimals) {
  if (type.toLocaleLowerCase().includes('balance')) {
    // TODO Get decimals from chain

    return formatBalance(value, {
      decimals,
      withSi: false,
      forceUnit: '-',
    }) as unknown as number;
  }

  return value;
}
