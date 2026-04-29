import { Test, TestingModule } from '@nestjs/testing';
import { TaskBoardService } from './task-board.service';

describe('TaskBoardService', () => {
  let service: TaskBoardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskBoardService],
    }).compile();

    service = module.get<TaskBoardService>(TaskBoardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
