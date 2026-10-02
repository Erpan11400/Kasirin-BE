import TokenManager from '../security/token-manager.js';
import response from '../utils/response.js';

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (token && token.indexOf('Bearer ') !== -1) {
        try {
            const user = TokenManager.verify(token.split('Bearer ')[1], process.env.JWT_ACCESS_SECRET);
            req.user = user;
            return next();
        } catch (error) {
            return response(res, 401, error.message, null);
        }
    }

    return response(res, 401, 'Unauthorized', null);
};

export default authenticateToken;