import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { signUpUser, type SignUpData } from '@/lib/auth-helpers';

const isValidEmail = (value: string) => {
  return /^(?:[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+)@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/u.test(
    value.trim()
  );
};

const isValidPhone = (value: string) => {
  return /^[6-9]\d{9}$/.test(value.trim().replace(/[\s-]/g, ''));
};

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = (): boolean => {
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!isValidPhone(formData.phoneNumber)) {
      setError('Please enter a valid 10-digit phone number.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const signUpData: SignUpData = {
        email: formData.email.trim(),
        password: formData.password,
        phoneNumber: formData.phoneNumber.trim(),
      };

      await signUpUser(signUpData);
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/10 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Sign up to start shopping</CardDescription>
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
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                placeholder="9876543210"
                value={formData.phoneNumber}
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
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
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
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/signin')}
              disabled={loading}
            >
              Already have an account? Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;
