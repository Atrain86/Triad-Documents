import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const LoginForm: React.FC = () => {
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('cortespainter@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(loginEmail, loginPassword);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await register(registerEmail, registerPassword, firstName, lastName);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Paint Brain Logo */}
        <div className="text-center mb-4">
          <div className="w-64 h-64 mx-auto flex items-center justify-center" style={{ backgroundColor: '#000000', boxShadow: 'inset 0 0 50px #000000' }}>
            <img 
              src="/PAINY BRAIN LOGO 1_1752338774418.png" 
              alt="Paint Brain Logo" 
              className="h-60 w-60 object-contain"
            />
          </div>
          <div className="text-gray-400 text-base -mt-1 leading-tight">
            <p className="text-center">Smart project management</p>
            <p className="text-center">for painters</p>
          </div>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                disabled={isLoading}
                className="placeholder:opacity-75"
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                disabled={isLoading}
                className="placeholder:opacity-75"
              />
            </div>
            
            {/* Side by side buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                onClick={handleLogin}
                className="bg-orange-600 hover:bg-orange-700"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <Button 
                onClick={handleRegister}
                variant="outline"
                disabled={isLoading}
              >
                Register
              </Button>
            </div>
          </CardContent>
          
          {error && (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;