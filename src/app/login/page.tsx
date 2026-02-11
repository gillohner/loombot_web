"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { PubkyAuthWidget } from "@/components/auth/pubky-auth-widget";
import { RecoveryFileAuth } from "@/components/auth/recovery-file-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, AlertCircle, QrCode, FileKey } from "lucide-react";
import type { Session, Keypair } from "@synonymdev/pubky";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signin, signinWithSession, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const returnPath = searchParams.get("returnPath") || "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push(returnPath);
    }
  }, [isAuthenticated, returnPath, router]);

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleQRSuccess = (publicKey: string, session?: Session) => {
    if (session) {
      signinWithSession(publicKey, session);
      router.push(returnPath);
    } else {
      setError("Authentication failed - no session returned");
    }
  };

  const handleRecoverySuccess = (
    publicKey: string,
    keypair: Keypair,
    session: Session
  ) => {
    signin(publicKey, keypair, session);
    router.push(returnPath);
  };

  const handleError = (err: Error) => {
    setError(err.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Pubky Bot Configurator</CardTitle>
          <CardDescription>
            Sign in with your Pubky identity to manage bot configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Pubky Ring
              </TabsTrigger>
              <TabsTrigger value="recovery" className="flex items-center gap-2">
                <FileKey className="h-4 w-4" />
                Recovery File
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-6">
              <PubkyAuthWidget
                open
                onSuccess={handleQRSuccess}
                onError={handleError}
              />
            </TabsContent>

            <TabsContent value="recovery" className="mt-6">
              <RecoveryFileAuth
                onSuccess={handleRecoverySuccess}
                onError={handleError}
              />
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Your data is stored on your Pubky homeserver. <br />
              No account creation needed - just sign in with your Pubky identity.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
