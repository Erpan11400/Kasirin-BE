import AuthorizationError from '../exceptions/authorization-error.js';

export const PermissionAction = Object.freeze({
    View: 'view',
    Create: 'create',
    Update: 'update',
    Delete: 'delete'
});

/**
 * Middleware Authorization berbasis Module dan Action
 * @param {string} moduleName - Nama modul/resource (contoh: 'products', 'pos')
 * @param {string} action - Akses yang dibutuhkan (contoh: 'read', 'create', 'update', 'delete')
 */
const Authorization = (moduleName, action) => {
    return (req, _, next) => {
        try {
            // console.log(req.user.permissions)
            // Ambil permissions dari req.user (diisi oleh middleware Authentication/JWT)
            const userPermissions = req.user?.permissions;

            // Cek apakah modul dan aksi tersebut diizinkan (bernilai true)
            const hasPermission = userPermissions?.[moduleName]?.[action] === true;

            if (!hasPermission) return next(new AuthorizationError(`Anda tidak memiliki akses ${action} untuk modul ${moduleName}`))

            next();
        } catch (error) {
            next(error);
        }
    };
};

export default Authorization;