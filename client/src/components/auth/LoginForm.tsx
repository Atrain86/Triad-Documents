import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onSuccess: (user: any, token: string) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("auth_token", data.token);
        onSuccess(data.user, data.token);
        toast({
          title: "Welcome back!",
          description: `Logged in as ${data.user.firstName} ${data.user.lastName}`,
        });
      } else {
        toast({
          title: "Login failed",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("auth_token", data.token);
        onSuccess(data.user, data.token);
        toast({
          title: "Account created!",
          description: `Welcome, ${data.user.firstName}! ${data.user.role === 'admin' ? 'You are the admin.' : 'You are a client user.'}`,
        });
      } else {
        toast({
          title: "Registration failed",
          description: data.error || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src="/aframe-logo.png" 
              alt="A-Frame Painting" 
              className="h-16 w-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl">A-Frame Painting</CardTitle>
            <CardDescription>Project Management System</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4 mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="First name"
                      value={registerData.firstName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      value={registerData.lastName}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regEmail">Email</Label>
                  <Input
                    id="regEmail"
                    type="email"
                    placeholder="Enter your email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPassword">Password</Label>
                  <Input
                    id="regPassword"
                    type="password"
                    placeholder="Create a password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                First user becomes admin, others are clients
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}