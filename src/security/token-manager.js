import jwt from 'jsonwebtoken';
import InvariantError from '../exceptions/invariant-error.js';

const TokenManager = {
    generateAccessToken: (payload) => jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '1d' }),
    generateRefreshToken: (payload) => jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }),
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