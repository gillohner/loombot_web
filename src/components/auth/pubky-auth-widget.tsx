"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import * as pubky from "@synonymdev/pubky";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface PubkyAuthWidgetProps {
  caps?: string;
  open?: boolean;
  onSuccess?: (
    publicKey: string,
    session?: pubky.Session,
    token?: pubky.AuthToken
  ) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function PubkyAuthWidget({
  caps = "/pub/bot_builder/:rw",
  open = false,
  onSuccess,
  onError,
  className = "",
}: PubkyAuthWidgetProps) {
  const [pubkyZ32, setPubkyZ32] = useState<string>("");
  const [authUrl, setAuthUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sdkRef = useRef<pubky.Pubky | null>(null);

  const handleCopyAuthUrl = useCallback(async () => {
    if (!authUrl) return;

    try {
      await navigator.clipboard.writeText(authUrl);
      setCopied(true);
      toast.success("Auth link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy link");
    }
  }, [authUrl]);

  const handleOpenInPubkyRing = useCallback(() => {
    if (!authUrl) return;
    const opened = window.open(authUrl, "_blank");
    if (!opened) {
      window.location.href = authUrl;
    }
  }, [authUrl]);

  const updateQr = useCallback(() => {
    if (!canvasRef.current || !authUrl) return;

    try {
      QRCode.toCanvas(canvasRef.current, authUrl, {
        margin: 2,
        width: 192,
        color: { light: "#ffffff", dark: "#000000" },
      });
    } catch (e) {
      console.error("QR render error:", e);
      onError?.(e as Error);
    }
  }, [authUrl, onError]);

  const generateFlow = useCallback(async () => {
    if (!sdkRef.current || isGenerating) return;

    setIsGenerating(true);
    setPubkyZ32("");
    setAuthUrl("");

    try {
      const relayUrl = config.relay.url;
      const flowKind = pubky.AuthFlowKind.signin();
      const flow = sdkRef.current.startAuthFlow(
        caps as pubky.Capabilities,
        flowKind,
        relayUrl
      );

      const url = flow.authorizationUrl;
      setAuthUrl(url);

      setTimeout(() => {
        updateQr();
        requestAnimationFrame(() => updateQr());
      }, 50);

      setIsGenerating(false);

      if (caps && caps.trim().length > 0) {
        const session = await flow.awaitApproval();
        const publicKey = session.info.publicKey.z32();
        setPubkyZ32(publicKey);
        onSuccess?.(publicKey, session);
      } else {
        const token = await flow.awaitToken();
        const publicKey = token.publicKey.z32();
        setPubkyZ32(publicKey);
        onSuccess?.(publicKey, undefined, token);
      }
    } catch (error) {
      console.error("Auth flow failed:", error);
      setIsGenerating(false);
      onError?.(error as Error);
    }
  }, [caps, onSuccess, onError, updateQr, isGenerating]);

  const handleRefresh = useCallback(() => {
    generateFlow();
  }, [generateFlow]);

  useEffect(() => {
    sdkRef.current =
      config.env === "testnet" ? pubky.Pubky.testnet() : new pubky.Pubky();
  }, []);

  useEffect(() => {
    if (open && !authUrl && sdkRef.current && !isGenerating) {
      const timer = setTimeout(() => {
        generateFlow();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, authUrl, generateFlow, isGenerating]);

  useEffect(() => {
    updateQr();
  }, [updateQr]);

  const showSuccess = Boolean(pubkyZ32);

  return (
    <div
      className={`relative flex flex-col items-center transition-all duration-300 ease-in-out ${className}`}
    >
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Scan with Pubky Ring to authenticate
      </p>

      {showSuccess ? (
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Check className="h-12 w-12 text-green-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Successfully authenticated!
          </p>
          <p className="text-xs font-mono break-all max-w-[300px] text-center">
            {pubkyZ32}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full">
          <div className="flex justify-center items-center bg-white p-4 rounded-2xl relative">
            {isGenerating ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <canvas ref={canvasRef} className="w-48 h-48" />
            )}
          </div>

          {authUrl && (
            <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
              <Button
                onClick={handleCopyAuthUrl}
                variant="outline"
                className="w-full"
                disabled={!authUrl}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Auth Link
                  </>
                )}
              </Button>
              <Button
                onClick={handleOpenInPubkyRing}
                variant="default"
                className="w-full"
                disabled={!authUrl}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Pubky Ring
              </Button>
              <Button
                onClick={handleRefresh}
                variant="ghost"
                className="w-full"
                disabled={isGenerating}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh QR Code
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
