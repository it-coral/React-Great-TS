import axios, { AxiosInstance } from 'axios';
import AuthService from './AuthService';

export default class AxiosFactory {
    axios: AxiosInstance;

    constructor() {
        let authService = new AuthService();
        let headers = {};

        if (authService.loggedIn()) {
            let token = authService.getToken();
            headers = {'Authorization': `Bearer ${token}`};
        }
        this.axios = axios.create({
            baseURL: `${process.env.REACT_APP_API_PATH}/`,
            headers: headers
        });
    }
}