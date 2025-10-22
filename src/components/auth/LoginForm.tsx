import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useUserAuth } from "@/context/UserAuthContext";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  onSwitchToPasswordReset?: () => void;
}

export const LoginForm = ({ onSuccess, onSwitchToSignup, onSwitchToPasswordReset }: LoginFormProps) => {
  const { login } = useUserAuth();
  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData.emailOrPhone.trim(), formData.password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Log In</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emailOrPhone">Email or Phone Number</Label>
            <Input
              id="emailOrPhone"
              name="emailOrPhone"
              type="text"
              placeholder="your@email.com or 9876543210"
              value={formData.emailOrPhone}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm"
            onClick={onSwitchToPasswordReset}
            disabled={loading}
          >
            Forgot password?
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onSwitchToSignup}
            disabled={loading}
          >
            Don't have an account? Sign up
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
