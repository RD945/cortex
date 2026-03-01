import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearch } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { QRScanner } from "@/components/auth/qr-scanner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { useToast } from "@/hooks/use-toast";
import { signIn } from "@/lib/auth";
import { apiFetch } from "@/lib/frontend-api";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

export default function LoginPage() {
  const { toast } = useToast();
  const { callbackUrl } = useSearch({ from: "/auth/login" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isQRLoading, setIsQRLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      await signIn.email({
        email: values.email,
        password: values.password,
        fetchOptions: {
          onSuccess: () => {
            toast({
              title: "Login successful!",
              description: "Welcome back to Cortex.",
            });
            // Use direct navigation for clean page load with session
            window.location.href = callbackUrl;
          },
          onError: () => {
            setError("Invalid email or password. Please try again.");
            toast({
              title: "Login failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          },
        },
      });
    } catch (_error) {
      setError("An unexpected error occurred. Please try again.");
      toast({
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQRScan(apiKey: string) {
    setShowQRScanner(false);
    setIsQRLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/auth/qr-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "QR login failed. Please try again.");
        toast({
          title: "QR login failed",
          description: data.error || "Invalid QR code.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login successful!",
        description: "Signed in via QR code.",
      });
      window.location.href = callbackUrl;
    } catch {
      setError("QR login failed. Please try again.");
    } finally {
      setIsQRLoading(false);
    }
  }

  return (
    <div className="container relative flex min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center">
          <Logo variant="auth" />
        </div>
        <div className="relative z-20 mt-auto">
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to sign in to your account
            </p>
          </div>
          {error && (
            <div className="p-3 bg-destructive/15 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || isQRLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          {/* QR Login - shown on all devices */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowQRScanner(true)}
            disabled={isLoading || isQRLoading}
          >
            {isQRLoading ? (
              "Signing in..."
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Scan QR Code
              </>
            )}
          </Button>

          <div className="text-center text-sm">
            Don't have an account?{" "}
            <Link to="/auth/register" className="text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>

      {/* QR Scanner overlay */}
      <QRScanner
        open={showQRScanner}
        onScan={handleQRScan}
        onClose={() => setShowQRScanner(false)}
      />
    </div>
  );
}
