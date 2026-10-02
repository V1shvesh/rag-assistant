import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseModule, PG_POOL } from './database.module';

describe('DatabaseModule', () => {
  it('resolves PG_POOL using DATABASE_URL from ConfigService', async () => {
    const getOrThrow = jest.fn().mockReturnValue('postgresql://fake/db');

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        DatabaseModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue({ getOrThrow })
      .compile();

    const pool = moduleRef.get<Pool>(PG_POOL);

    expect(pool).toBeInstanceOf(Pool);
    expect(getOrThrow).toHaveBeenCalledWith('DATABASE_URL');

    await pool.end();
  });
});
