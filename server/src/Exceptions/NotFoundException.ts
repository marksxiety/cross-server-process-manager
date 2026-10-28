import { HttpException } from './HttpException';

export class NotFoundException extends HttpException {
    constructor(resource: string) {
        super(404, `${resource} not found`, 'NOT_FOUND');
        this.name = 'NotFoundException';
    }
}
