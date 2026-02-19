import { useState, useCallback, useRef } from 'react';
import type { OTPDeliveryStatus, OTPDeliveryRecord } from './types';

export interface OTPCallbacks {
  onGenerate: (waypointIndex: number, otp: string, expiresAt: string) => Promise<void>;
  onVerify: (waypointIndex: number, otp: string) => Promise<boolean>;
}

export interface UseOTPVerificationOptions {
  waypointIndex: number;
  waypointTitle?: string;
  metadata?: Record<string, string>;
  codeLength?: number;
  expirySeconds?: number;
  maxAttempts?: number;
  callbacks: OTPCallbacks;
}

export interface UseOTPVerificationReturn {
  status: OTPDeliveryStatus;
  otp: string;
  enteredCode: string;
  setEnteredCode: (code: string) => void;
  generate: () => Promise<void>;
  verify: () => Promise<boolean>;
  reset: () => void;
  attempts: number;
  maxAttempts: number;
  remainingSeconds: number;
  isExpired: boolean;
  record: OTPDeliveryRecord | null;
}

/**
 * Hook for OTP-based delivery verification. The driver app generates
 * an OTP when approaching a stop, your backend sends it to the customer
 * (via push notification, in-app message, etc.), and the driver enters
 * the code provided by the customer to confirm delivery.
 *
 * This hook is backend-agnostic — you provide two callbacks:
 * - `onGenerate`: called when OTP is created. Send it to your backend,
 *   which pushes it to the customer.
 * - `onVerify`: called when driver enters a code. Validate against your
 *   backend and return true/false.
 *
 * @example
 * ```tsx
 * import { useOTPVerification } from 'react-native-google-nav';
 *
 * function OTPScreen({ waypointIndex, waypointTitle, orderId }) {
 *   const otp = useOTPVerification({
 *     waypointIndex,
 *     waypointTitle,
 *     expirySeconds: 300, // 5 minutes
 *     maxAttempts: 3,
 *     callbacks: {
 *       onGenerate: async (wpIndex, code, expiresAt) => {
 *         // Send OTP to your backend → backend pushes to customer
 *         await supabase.from('delivery_otps').insert({
 *           order_id: orderId,
 *           otp: code,
 *           expires_at: expiresAt,
 *         });
 *         // Backend trigger sends push notification to customer
 *       },
 *       onVerify: async (wpIndex, code) => {
 *         // Validate OTP with your backend
 *         const { data } = await supabase.rpc('verify_delivery_otp', {
 *           p_order_id: orderId,
 *           p_otp: code,
 *         });
 *         return data === true;
 *       },
 *     },
 *   });
 *
 *   return (
 *     <View>
 *       <Text>Status: {otp.status}</Text>
 *       <Text>Time remaining: {otp.remainingSeconds}s</Text>
 *       {otp.status === 'idle' && (
 *         <Button onPress={otp.generate} title="Generate OTP" />
 *       )}
 *       {otp.status === 'sent' && (
 *         <>
 *           <TextInput
 *             value={otp.enteredCode}
 *             onChangeText={otp.setEnteredCode}
 *             maxLength={6}
 *             keyboardType="number-pad"
 *           />
 *           <Button onPress={otp.verify} title="Verify" />
 *         </>
 *       )}
 *       {otp.status === 'verified' && <Text>Delivery confirmed!</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useOTPVerification(
  options: UseOTPVerificationOptions
): UseOTPVerificationReturn {
  const {
    waypointIndex,
    waypointTitle = '',
    metadata,
    codeLength = 6,
    expirySeconds = 300,
    maxAttempts = 3,
    callbacks,
  } = options;

  const [status, setStatus] = useState<OTPDeliveryStatus>('idle');
  const [otp, setOtp] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(expirySeconds);
  const [record, setRecord] = useState<OTPDeliveryRecord | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiresAtRef = useRef<string>('');

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    clearTimer();
    setRemainingSeconds(expirySeconds);
    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [expirySeconds, clearTimer]);

  const generateCode = useCallback((): string => {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < codeLength; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }, [codeLength]);

  const generate = useCallback(async () => {
    setStatus('generating');
    const code = generateCode();
    const now = new Date();
    const expires = new Date(now.getTime() + expirySeconds * 1000);
    const generatedAt = now.toISOString();
    const expiresAt = expires.toISOString();
    expiresAtRef.current = expiresAt;

    try {
      await callbacks.onGenerate(waypointIndex, code, expiresAt);
      setOtp(code);
      setAttempts(0);
      setEnteredCode('');
      setStatus('sent');
      startCountdown();

      const rec: OTPDeliveryRecord = {
        waypointIndex,
        waypointTitle,
        otp: code,
        status: 'sent',
        generatedAt,
        expiresAt,
        attempts: 0,
        metadata,
      };
      setRecord(rec);
    } catch {
      setStatus('failed');
    }
  }, [
    generateCode,
    expirySeconds,
    callbacks,
    waypointIndex,
    waypointTitle,
    metadata,
    startCountdown,
  ]);

  const verify = useCallback(async (): Promise<boolean> => {
    if (status === 'expired') return false;
    if (attempts >= maxAttempts) {
      setStatus('failed');
      return false;
    }

    setStatus('verifying');
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    try {
      const isValid = await callbacks.onVerify(waypointIndex, enteredCode);

      if (isValid) {
        clearTimer();
        setStatus('verified');
        setRecord((prev) =>
          prev
            ? {
                ...prev,
                status: 'verified',
                verifiedAt: new Date().toISOString(),
                attempts: newAttempts,
              }
            : null
        );
        return true;
      } else {
        if (newAttempts >= maxAttempts) {
          clearTimer();
          setStatus('failed');
          setRecord((prev) =>
            prev ? { ...prev, status: 'failed', attempts: newAttempts } : null
          );
        } else {
          setStatus('sent');
          setRecord((prev) =>
            prev ? { ...prev, attempts: newAttempts } : null
          );
        }
        return false;
      }
    } catch {
      setStatus('failed');
      return false;
    }
  }, [status, attempts, maxAttempts, callbacks, waypointIndex, enteredCode, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setStatus('idle');
    setOtp('');
    setEnteredCode('');
    setAttempts(0);
    setRemainingSeconds(expirySeconds);
    setRecord(null);
  }, [clearTimer, expirySeconds]);

  return {
    status,
    otp,
    enteredCode,
    setEnteredCode,
    generate,
    verify,
    reset,
    attempts,
    maxAttempts,
    remainingSeconds,
    isExpired: status === 'expired',
    record,
  };
}
