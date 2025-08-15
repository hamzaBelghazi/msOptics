import axios from './axiosConfig';

class BaseRoutes {
    constructor(basePath) {
        this._basePath = basePath;
    }

    _get = async (path, { params, getLength } = { params: {} }) => {
        const res = await axios.get(this._basePath + path, {
            params,
        });

        if (getLength) {
            return {
                data: res.data.data,
                length: res.data.length,
            };
        }

        return res.data?.data;
    };

    _post = async (
        path,
        data,
        { params, headers } = { params: {}, headers: {} }
    ) => {
        const res = await axios.post(this._basePath + path, data, {
            params,
            headers,
        });

        return res.data?.data;
    };

    _put = async (
        path,
        data,
        { params, headers } = { params: {}, headers: {} }
    ) => {
        const res = await axios.put(this._basePath + path, data, {
            params,
            headers,
        });

        return res.data?.data;
    };

    _remove = async (path) => {
        const res = await axios.delete(this._basePath + path);

        return res.data?.data;
    };
}

export default BaseRoutes;
