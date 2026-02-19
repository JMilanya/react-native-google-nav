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
export declare function useOTPVerification(options: UseOTPVerificationOptions): UseOTPVerificationReturn;
//# sourceMappingURL=useOTPVerification.d.ts.map