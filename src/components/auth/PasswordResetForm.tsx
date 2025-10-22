import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useUserAuth } from "@/context/UserAuthContext";

interface PasswordResetFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export const PasswordResetForm = ({ onSuccess, onBack }: PasswordResetFormProps) => {
  const { requestPasswordReset } = useUserAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await requestPasswordReset(email.trim());
      setSuccess(true);
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your email to receive password reset instructions</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-800 p-4 rounded space-y-2">
              <p className="font-semibold">Email sent successfully!</p>
              <p className="text-sm">Check your email for password reset instructions.</p>
            </div>
            <Button onClick={onBack} className="w-full">
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
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
                  Sending...
                </>
              ) : (
                "Send Reset Email"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBack}
              disabled={loading}
            >
              Back to Login
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
