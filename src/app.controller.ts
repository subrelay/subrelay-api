import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
@ApiTags('Health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  @ApiOkResponse({
    description: 'Health check',
    schema: {
      nullable: false,
      example: 'SubRelay API',
      type: 'string',
    },
  })
  health(): string {
    return this.appService.health();
  }
}
