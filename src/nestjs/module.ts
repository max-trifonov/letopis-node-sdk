import { type DynamicModule, type InjectionToken, type OptionalFactoryDependency, Global, Module } from '@nestjs/common'
import { LetopisClient } from '../client.js'
import type { LetopisConfig } from '../types.js'

export const LETOPIS_CLIENT = Symbol('LETOPIS_CLIENT')

export interface LetopisModuleAsyncOptions {
  // any[] matches Nest's own FactoryProvider.useFactory signature; typed
  // params in user factories (e.g. ConfigService) stay assignable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => LetopisConfig | Promise<LetopisConfig>
  inject?: Array<InjectionToken | OptionalFactoryDependency>
}

@Global()
@Module({})
export class LetopisModule {
  /**
   * Synchronous registration.
   *
   * @example
   * LetopisModule.forRoot({
   *   baseUrl: process.env.LETOPIS_BASE_URL!,
   *   apiKey:  process.env.LETOPIS_API_KEY!,
   *   source:  'my-nestjs-app',
   * })
   */
  static forRoot(config: LetopisConfig): DynamicModule {
    return {
      module: LetopisModule,
      providers: [{ provide: LETOPIS_CLIENT, useValue: new LetopisClient(config) }],
      exports:   [LETOPIS_CLIENT],
    }
  }

  /**
   * Asynchronous registration — use when config comes from ConfigService, etc.
   *
   * @example
   * LetopisModule.forRootAsync({
   *   inject:      [ConfigService],
   *   useFactory:  (cfg: ConfigService) => ({
   *     baseUrl: cfg.get('LETOPIS_BASE_URL'),
   *     apiKey:  cfg.get('LETOPIS_API_KEY'),
   *     source:  cfg.get('APP_NAME'),
   *   }),
   * })
   */
  static forRootAsync(options: LetopisModuleAsyncOptions): DynamicModule {
    return {
      module: LetopisModule,
      providers: [
        {
          provide:    LETOPIS_CLIENT,
          useFactory: async (...args: unknown[]) => {
            const config = await options.useFactory(...args)
            return new LetopisClient(config)
          },
          inject: options.inject ?? [],
        },
      ],
      exports: [LETOPIS_CLIENT],
    }
  }
}
