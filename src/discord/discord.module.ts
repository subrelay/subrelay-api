import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiscordModule } from '@discord-nestjs/core';
import { GatewayIntentBits } from 'discord.js';
import { UserModule } from '../user/user.module';
import { DiscordService } from './discord.service';

@Module({
  imports: [
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
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordProcessorModule {}
