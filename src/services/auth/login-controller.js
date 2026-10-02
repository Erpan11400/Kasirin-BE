import bcrypt from 'bcrypt'
import Users from "../../models/Users.js";
import RefreshToken from "../../models/RefreshToken.js";
import InvariantError from '../../exceptions/invariant-error.js';
import AuthenticationError from '../../exceptions/authentication-error.js';
import response from '../../utils/response.js';
import TokenManager from '../../security/token-manager.js';

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body

        const user = await Users.findOne({ email }).select('+password').populate('roleId', 'name permissions');
        if (!user) return next(new AuthenticationError('Email atau password salah'));

        if (!user.isActive) return next(new InvariantError('Akun sedang dinonaktifkan'));

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return next(new AuthenticationError('Email atau password salah'));

        const permissions = user.roleId.permissions

        const payload = {
            id: user._id,
            permissions
        }

        const accessToken = TokenManager.generateAccessToken(payload);
        const refreshToken = TokenManager.generateRefreshToken(payload);

        const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await RefreshToken.create({ token: refreshToken, userId: user._id, expiresAt: oneWeekFromNow });

        return response(res, 200, 'Login berhasil', {
            accessToken,
            refreshToken,
            name: user.name,
            roleName: user.roleId.name,
            permissions
        });
    } catch (error) {
        return next(error)
    }
}

export const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: tokenFromRequest } = req.body;

        if (!tokenFromRequest) return next(new InvariantError('Refresh Token wajib diisi.'))

        const payload = TokenManager.verifyRefreshToken(tokenFromRequest)

        const storedToken = await RefreshToken.findOne({ token: tokenFromRequest });
        if (!storedToken) return next(new InvariantError('Refresh token tidak valid atau sudah kadaluarsa.'))

        const accessToken = TokenManager.generateAccessToken(payload);
        return response(res, 200, 'Refresh Token berhasil', accessToken)

    } catch (error) {
        return next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body
        if (!refreshToken) return next(new InvariantError('Refresh token tidak valid'));

        await RefreshToken.deleteOne({ token: refreshToken });

        return response(res, 200, 'Logout berhasil', '');
    } catch (error) {
        return next(error)
    }
}