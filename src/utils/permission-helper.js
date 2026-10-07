/**
 * Mengonversi object permissions (Mongoose Subdocument / Plain Object)
 * menjadi array of string dengan format "module:action" untuk setiap aksi yang bernilai true.
 * 
 * Contoh output: ['categories:view', 'categories:create', 'products:view', ...]
 * 
 * @param {Object} permissionsObj
 * @returns {string[]}
 */
export const formatPermissions = (permissionsObj) => {
    if (!permissionsObj) return [];

    const rawPermissions = typeof permissionsObj.toObject === 'function'
        ? permissionsObj.toObject()
        : permissionsObj;

    const formatted = [];
    for (const [moduleName, actions] of Object.entries(rawPermissions)) {
        if (actions && typeof actions === 'object') {
            for (const [actionName, isAllowed] of Object.entries(actions)) {
                if (isAllowed === true) {
                    formatted.push(`${moduleName}:${actionName}`);
                }
            }
        }
    }
    return formatted;
};
