import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiscordModule } from '@discord-nestjs/core';
import { GatewayIntentBits } from 'discord.js';
import { UserModule } from '../user/user.module';
import { SetUpKeyCommand } from './set-up-key.command';
import { GetKeyCommand } from './get-key.command';
import { HelpCommand } from './help.command';
import { DiscordService } from './discord.service';

@Module({
  imports: [
    UserModule,
    DiscordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get('DISCORD_BOT_TOKEN'),
        discordClientOptions: {
          intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
        },
        failOnLogin: true,
      }),
    }),
  ],
  providers: [SetUpKeyCommand, GetKeyCommand, HelpCommand, DiscordService],
  exports: [DiscordService],
})
export class DiscordProcessorModule {}
