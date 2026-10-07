import ClientError from './client-error.js';

class ForbiddenError extends ClientError {
    constructor(message = 'Akses ditolak. Anda tidak memiliki izin untuk mengakses resource ini.') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

export default ForbiddenError;
