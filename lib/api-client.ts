import axios from "axios"

export const apiClient = axios.create({
    baseURL: "/api",
    headers: {
        Accept: "application/json",
    },
})

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const apiError = error?.response?.data?.error
        if (apiError && typeof apiError === "string") {
            error.message = apiError
        }
        return Promise.reject(error)
    }
)

