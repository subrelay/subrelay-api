import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            health: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get<AppController>(AppController);
    service = moduleRef.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('health', () => {
    it('should return the result of appService.health()', () => {
      jest.spyOn(service, 'health').mockReturnValue('OK');

      const result = controller.health();

      expect(result).toBe('OK');
      expect(service.health).toHaveBeenCalled();
    });
  });
});
