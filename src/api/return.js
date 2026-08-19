import api from './index';

export const getReturns = (params) => {
	return api.get('/bill/returns', { params });
};

export const getReturnDetail = (id) => {
	return api.get(`/bill/returns/${id}`);
};

export const auditReturn = (id, data) => {
	return api.post(`/bill/returns/${id}/audit`, data);
};
return