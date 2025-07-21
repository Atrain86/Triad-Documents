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
        <div className="text-center mb-8">
          <div className="w-64 h-64 mx-auto bg-black rounded-lg flex items-center justify-center">
            <img 
              src="/PAINY BRAIN LOGO 1_1752338774418.png" 
              alt="Paint Brain Logo" 
              className="h-60 w-60 object-contain"
            />
          </div>
          <p className="text-gray-400 text-sm mt-4">Smart project management for painters</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                disabled={isLoading}
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
        
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold mb-2">Login Credentials:</p>
          <p><strong>Email:</strong> cortespainter@gmail.com</p>
          <p><strong>Password:</strong> brain</p>
          <p className="mt-2 text-xs">Or register as a new client</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;