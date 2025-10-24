import { QueryClient } from "@tanstack/react-query";
export declare function apiRequest(url: string, options: {
    method: string;
    body?: unknown | undefined;
}): Promise<Response>;
type UnauthorizedBehavior = "returnNull" | "throw";
export declare const getQueryFn: <T>(options: {
    on401: UnauthorizedBehavior;
}) => ({ queryKey }: {
    queryKey: readonly unknown[];
}) => Promise<T | null>;
export declare const queryClient: QueryClient;
export {};
