import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { signInUser, type SignInData } from '@/lib/auth-helpers';

const SignIn = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email.trim()) {
      setError('Please enter your email.');
      return;
    }

    if (!formData.password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const signInData: SignInData = {
        email: formData.email.trim(),
        password: formData.password,
      };

      await signInUser(signInData);
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
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
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/signup')}
              disabled={loading}
            >
              Don't have an account? Sign Up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
