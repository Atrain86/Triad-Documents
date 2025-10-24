import { ReactNode } from 'react';
interface LoginGateProps {
    onAuthenticated: () => void;
    children: ReactNode;
}
export default function LoginGate({ onAuthenticated, children }: LoginGateProps): import("react/jsx-runtime").JSX.Element;
export {};
