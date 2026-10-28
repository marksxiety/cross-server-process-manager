import { HttpException } from './HttpException';

export class DuplicateResourceException extends HttpException {
    constructor(message: string, code: string) {
        super(409, message, code);
        this.name = 'DuplicateResourceException';
    }
}
