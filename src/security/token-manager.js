import jwt from 'jsonwebtoken';
import InvariantError from '../exceptions/invariant-error.js';

const TokenManager = {
    generateAccessToken: (payload) => {
        const expiresInMinutes = process.env.ACCESS_TOKEN_EXPIRED_PERIODE_MINUTE || '15';
        return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: `${expiresInMinutes}m` });
    },
    generateRefreshToken: (payload) => {
        const expiresInMinutes = process.env.REFRESH_TOKEN_EXPIRED_PERIODE_MINUTE || '10080';
        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: `${expiresInMinutes}m` });
    },
    verifyRefreshToken: (refreshToken) => {
        try {
            const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            return payload;
        } catch (error) {
            console.log(error);
            throw new InvariantError('Refresh token tidak valid');
        }
    },
    verify: (accessToken, secret) => {
        try {
            const payload = jwt.verify(accessToken, secret);
            return payload;
        } catch (error) {
            console.log(error);
            throw new InvariantError('Access token tidak valid');
        }
    }
}

export default TokenManager