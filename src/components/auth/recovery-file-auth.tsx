"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PubkyClient } from "@/lib/pubky/client";
import { Upload, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RecoveryFileAuthProps {
  onSuccess: (
    publicKey: string,
    keypair: import("@synonymdev/pubky").Keypair,
    session: import("@synonymdev/pubky").Session
  ) => void;
  onError?: (error: Error) => void;
}

export function RecoveryFileAuth({ onSuccess, onError }: RecoveryFileAuthProps) {
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/octet-stream": [".pkarr"],
    },
    maxFiles: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a recovery file");
      return;
    }

    if (!passphrase) {
      toast.error("Please enter your passphrase");
      return;
    }

    setIsLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const recoveryFile = new Uint8Array(arrayBuffer);

      const keypair = PubkyClient.restoreFromRecoveryFile(
        recoveryFile,
        passphrase
      );

      const client = new PubkyClient();
      const session = await client.signin(keypair);
      const publicKey = keypair.publicKey.z32();

      onSuccess(publicKey, keypair, session);
      toast.success("Successfully signed in!");
    } catch (error) {
      console.error("Recovery file auth failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to sign in";
      toast.error(errorMessage);
      onError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="recovery-file">Recovery File</Label>
        <div
          {...getRootProps()}
          className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : file
              ? "border-green-500 bg-green-500/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} id="recovery-file" />
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          {file ? (
            <p className="text-sm text-green-600">{file.name}</p>
          ) : isDragActive ? (
            <p className="text-sm text-muted-foreground">
              Drop the recovery file here...
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Drag and drop your .pkarr recovery file, or click to select
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="passphrase">Passphrase</Label>
        <div className="relative mt-2">
          <Input
            id="passphrase"
            type={showPassphrase ? "text" : "password"}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter your recovery passphrase"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassphrase(!showPassphrase)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassphrase ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !file}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
