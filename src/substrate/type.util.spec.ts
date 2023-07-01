import { formatValue } from './type.util';

describe('formatValue', () => {
  it('should return value unchanged if type does not include "balance"', () => {
    const value = 10;
    const type = 'otherType';
    const decimals = 2;

    const result = formatValue(type, value, decimals);

    expect(result).toBe(value);
  });

  it('should format balance value with given decimals if type includes "balance"', () => {
    const value = 1000000000;
    const type = 'balanceOf';
    const decimals = 12;

    const result = formatValue(type, value, decimals);

    expect(result).toBe('0.01');
  });
});
