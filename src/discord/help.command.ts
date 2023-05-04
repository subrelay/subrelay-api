import { Command, Handler } from '@discord-nestjs/core';

@Command({
  name: 'helps',
  description: 'Get current key.',
})
export class HelpCommand {
  @Handler()
  async onHelpsCommand(): Promise<string> {
    return `Helpful links:

  👉   [SubRelay Docs](https://docs.subrelay.xyz/)

  👉   [SubRelay App](https://app.subrelay.xyz/#/welcome)      
      `;
  }
}
