export class HttpException extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly code: string,
        public readonly info: unknown = null
    ) {
        super(message);
        this.name = 'HttpException';
    }
}
