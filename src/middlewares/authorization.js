import ForbiddenError from '../exceptions/forbidden-error.js';

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
            // Ambil permissions dari req.user (diisi oleh middleware Authentication/JWT)
            const userPermissions = req.user?.permissions;

            const requiredPermission = `${moduleName}:${action}`;

            // Cek apakah modul dan aksi tersebut diizinkan (mendukung format array 'module:action' dan object lama)
            const hasPermission = Array.isArray(userPermissions)
                ? userPermissions.includes(requiredPermission)
                : userPermissions?.[moduleName]?.[action] === true;

            if (!hasPermission) return next(new ForbiddenError(`Anda tidak memiliki akses ${action} untuk modul ${moduleName}`));

            next();
        } catch (error) {
            next(error);
        }
    };
};

export default Authorization;