import { HttpException } from './HttpException';

export class ValidationException extends HttpException {
    constructor(message: string, fieldErrors: unknown = null) {
        super(400, message, 'VALIDATION_FAILED', fieldErrors);
        this.name = 'ValidationException';
    }
}
