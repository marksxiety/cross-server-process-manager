export class DatabaseException extends Error {
    constructor(
        message: string,
        public readonly code: string = 'INTERNAL_SERVER_ERROR',
        options?: ErrorOptions
    ) {
        super(message, options);
        this.name = 'DatabaseException';
    }
}
