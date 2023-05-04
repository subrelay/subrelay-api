import { SlashCommandPipe } from '@discord-nestjs/common';
import {
  Command,
  EventParams,
  Handler,
  InteractionEvent,
} from '@discord-nestjs/core';
import { ClientEvents } from 'discord.js';
import { SetKeyDto } from './key.dto';
import { UserService } from '../user/user.service';
import { isEmpty } from 'lodash';

@Command({
  name: 'key',
  description: 'Set up a new key to integrate with SubRelay.',
})
export class SetUpKeyCommand {
  constructor(private readonly userService: UserService) {}

  @Handler()
  async onSetUpKeyCommand(
    @InteractionEvent(SlashCommandPipe) dto: SetKeyDto,
    @EventParams() args: ClientEvents['interactionCreate'],
  ): Promise<string> {
    const chatId = args[0].user.id;

    const user = await this.userService.getUserByIntegrationKey(dto.key);
    if (!user || isEmpty(dto.key)) {
      return 'Invalid key.';
    } else {
      const integration = {
        ...user.integration,
        discord: chatId,
      };
      await this.userService.updateUserIntegration(user.id, integration);
      return `Added key.`;
    }
  }
}
