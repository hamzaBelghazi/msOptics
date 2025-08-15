import BaseRoutes from './BaseRoutes';

class AuthRoutes extends BaseRoutes {
    constructor() {
        super('/users');
    }

    register = (data) => {
        return this._post('/register', data);
    };

    login = (data) => {
        return this._post('/login', data);
    };

    logout = () => {
        return this._post('/logout');
    };

    forgotPassword = (data) => {
        return this._post('/forgot-password', data);
    };

    resetPassword = (data) => {
        return this._post('/reset-password', data);
    };
}

export default new AuthRoutes();
