import { HttpException } from '../Exceptions/HttpException';

export function linkExpired(): HttpException {
    return new HttpException(400, 'This link has expired. Request a new one.', 'LINK_EXPIRED');
}

export function linkAlreadyUsed(): HttpException {
    return new HttpException(
        400,
        'This link has already been used. Request a new one.',
        'LINK_ALREADY_USED'
    );
}

export function linkInvalid(): HttpException {
    return new HttpException(400, 'This link is invalid. Request a new one.', 'LINK_INVALID');
}
