import axios, { AxiosInstance } from 'axios';
// import AuthService from './AuthService';
import Auth0Service from './Auth0Service';

export default class AxiosFactory {
    axios: AxiosInstance;

    constructor() {
        let authService = new Auth0Service();
        let headers = {};

        if (authService.loggedIn()) {
            let token = authService.getAccessToken();
            headers = {'Authorization': `Bearer ${token}`};
        }

        this.axios = axios.create({
            baseURL: `${process.env.REACT_APP_API_PATH}/`,
            headers: headers
        });
    }
}