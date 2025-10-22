import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useUserAuth } from "@/context/UserAuthContext";

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const TEST_OTP = "123456";

export const SignupForm = ({ onSuccess, onSwitchToLogin }: SignupFormProps) => {
  const { signup, isSignup, pendingOtp, verifyOtp } = useUserAuth();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!formData.fullName.trim()) {
        throw new Error("Please enter your full name.");
      }
      if (!formData.email.trim()) {
        throw new Error("Please enter your email address.");
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      if (!formData.phoneNumber.trim()) {
        throw new Error("Please enter your phone number.");
      }

      await signup({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phoneNumber: formData.phoneNumber.trim(),
      });

      setStep("otp");
      setOtp("");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!/^[0-9]{6}$/.test(otp.trim())) {
        throw new Error("Enter the 6-digit OTP.");
      }

      await verifyOtp(otp.trim());
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setStep("form");
    setOtp("");
    setError("");
  };

  if (step === "otp") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify Phone Number</CardTitle>
          <CardDescription>
            We sent a verification code to {formData.phoneNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError("");
                }}
                maxLength={6}
                disabled={loading}
                required
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground text-center">
                Test OTP: 123456
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Create Account"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up to start ordering</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={handleChange}
              disabled={loading || isSignup}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading || isSignup}
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
              disabled={loading || isSignup}
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
              disabled={loading || isSignup}
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
              disabled={loading || isSignup}
              required
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || isSignup}>
            {loading || isSignup ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending OTP...
              </>
            ) : (
              "Send OTP"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onSwitchToLogin}
            disabled={loading || isSignup}
          >
            Already have an account? Log in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
