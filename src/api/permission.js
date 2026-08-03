// api/permission.js
export const getFieldPermissions = (module) => {
    return request.get('/api/permission/fields', { params: { module } });
};

// stores/permStore.js
export const usePermStore = defineStore('permission', {
    state: () => ({
        fieldPerms: {},
        currentRole: null
    }),
    actions: {
        async loadFieldPermissions(module) {
            const res = await getFieldPermissions(module);
            this.fieldPerms[module] = res.data;
            return res.data;
        },
        canEdit(module, fieldName) {
            const perms = this.fieldPerms[module];
            return perms?.editableFields?.includes(fieldName) ?? false;
        },
        canView(module, fieldName) {
            const perms = this.fieldPerms[module];
            return perms?.visibleFields?.includes(fieldName) ?? false;
        }
    }
});