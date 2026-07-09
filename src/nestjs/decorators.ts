import { Inject } from '@nestjs/common'
import { LETOPIS_CLIENT } from './module.js'

/**
 * Inject the LetopisClient instance into a NestJS service or controller.
 *
 * @example
 * constructor(@InjectLetopis() private letopis: LetopisClient) {}
 */
export const InjectLetopis = (): ParameterDecorator => Inject(LETOPIS_CLIENT)
