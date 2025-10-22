import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useUserAuth } from "@/context/UserAuthContext";

interface OTPVerificationProps {
  phoneNumber?: string;
  type?: "signup" | "phone_change";
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const OTPVerification = ({ 
  phoneNumber = "", 
  type = "signup",
  onSuccess, 
  onCancel 
}: OTPVerificationProps) => {
  const { verifyOtp, verifyPhoneOtp, pendingOtp } = useUserAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (type === "signup") {
        await verifyOtp(otp);
      } else {
        await verifyPhoneOtp(otp);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const displayPhone = phoneNumber || (pendingOtp?.phoneNumber ? `****${pendingOtp.phoneNumber.slice(-4)}` : "your phone");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify Phone Number</CardTitle>
        <CardDescription>
          We sent a verification code to {displayPhone}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              "Verify"
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
