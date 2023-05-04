import { Param } from '@discord-nestjs/core';

export class SetKeyDto {
  @Param({
    name: 'key',
    description: 'The key to integrate with SubRelay',
    required: true,
  })
  key: string;
}
