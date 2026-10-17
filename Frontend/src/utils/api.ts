export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';


export const getAuthHeaders = () => {
    const token = localStorage.getItem('access');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(getAuthHeaders() as Record<string, string>),
    };
    
    const headers = {
        ...defaultHeaders,
        ...(options.headers as Record<string, string>),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMessage = 'An error occurred';
        try {
            const errorData = await response.json();
            if (errorData.detail) {
                errorMessage = errorData.detail;
            } else if (errorData.error) {
                errorMessage = errorData.error;
            } else if (errorData && typeof errorData === 'object') {
                const messages = Object.entries(errorData).flatMap(([key, value]) => {
                    const prefix = key === 'non_field_errors' ? '' : `${key}: `;
                    if (Array.isArray(value)) {
                        return value.map(msg => `${prefix}${msg}`);
                    }
                    return `${prefix}${value}`;
                });
                if (messages.length > 0) {
                    errorMessage = messages.join('\n');
                } else {
                    errorMessage = JSON.stringify(errorData);
                }
            } else {
                errorMessage = String(errorData);
            }
        } catch {
            errorMessage = response.statusText;
        }
        throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return null;
    }

    return response.json();
};
