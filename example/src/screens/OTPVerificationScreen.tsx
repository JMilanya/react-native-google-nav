import { useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOTPVerification } from 'react-native-google-nav';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import type { RootStackParamList, OTPStatus } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'OTPVerification'>;

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { waypointIndex, waypointTitle, metadata } = route.params;

  const goBackWithResult = (status: OTPStatus) => {
    const state = navigation.getState();
    const navRoute = state.routes.find((r) => r.name === 'Navigation');
    if (navRoute) {
      navigation.dispatch({
        ...CommonActions.setParams({ otpResult: { waypointIndex, status } }),
        source: navRoute.key,
      });
    }
    navigation.goBack();
  };

  const otp = useOTPVerification({
    waypointIndex,
    waypointTitle,
    metadata,
    codeLength: 6,
    expirySeconds: 300,
    maxAttempts: 3,
    callbacks: {
      onGenerate: async (_wpIndex, code, expiresAt) => {
        // In a real app: send to your backend → backend pushes to customer
        // await supabase.from('delivery_otps').insert({ order_id, otp: code, expires_at: expiresAt });
        console.log(`[OTP] Generated code ${code} for stop #${_wpIndex + 1}, expires ${expiresAt}`);
        // Simulating backend delay
        await new Promise((r) => setTimeout(r, 500));     
      },
      onVerify: async (_wpIndex, code) => {
        // In a real app: validate with your backend
        // const { data } = await supabase.rpc('verify_delivery_otp', { p_order_id: orderId, p_otp: code });
        console.log(`[OTP] Verifying code "${code}" for stop #${_wpIndex + 1}`);
        await new Promise((r) => setTimeout(r, 300));
        // For demo: only accept the actual generated OTP
        return code === otp.otp;
      },
    },
  });

  // Auto-generate OTP on mount
  useEffect(() => {
    if (otp.status === 'idle') {
      otp.generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Delivery Verification</Text>
          <Text style={styles.subtitle}>
            Stop #{waypointIndex + 1}: {waypointTitle}
          </Text>
          {metadata?.customerName && (
            <Text style={styles.customerName}>{metadata.customerName}</Text>
          )}
        </View>

        {/* Status indicator */}
        <View style={[styles.statusBadge, statusStyles[otp.status]]}>
          <Text style={[styles.statusText, statusTextStyles[otp.status]]}>
            {STATUS_LABELS[otp.status]}
          </Text>
        </View>

        {/* Generating state */}
        {(otp.status === 'generating' || otp.status === 'verifying') && (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>
              {otp.status === 'generating' ? 'Generating code...' : 'Verifying...'}
            </Text>
          </View>
        )}

        {/* OTP sent — show code (for demo) + entry field */}
        {(otp.status === 'sent' || otp.status === 'awaiting_entry') && (
          <View style={styles.otpSection}>
            {/* In production, the driver wouldn't see this — only the customer gets it */}
            <View style={styles.demoCodeBox}>
              <Text style={styles.demoLabel}>Customer received this code:</Text>
              <Text style={styles.demoCode}>{otp.otp}</Text>
              <Text style={styles.demoHint}>
                (In production, sent via push notification)
              </Text>
            </View>

            {/* Timer */}
            <View style={styles.timerRow}>
              <Text style={styles.timerLabel}>Expires in</Text>
              <Text style={[
                styles.timerValue,
                otp.remainingSeconds <= 60 && styles.timerWarning,
              ]}>
                {formatTime(otp.remainingSeconds)}
              </Text>
            </View>

            {/* Entry field */}
            <Text style={styles.entryLabel}>Enter code from customer</Text>
            <TextInput
              style={styles.codeInput}
              value={otp.enteredCode}
              onChangeText={otp.setEnteredCode}
              placeholder="000000"
              placeholderTextColor="#ccc"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
            />

            {otp.attempts > 0 && otp.status === 'sent' && (
              <Text style={styles.attemptsText}>
                Wrong code. {otp.maxAttempts - otp.attempts} attempt(s) remaining.
              </Text>
            )}

            {/* Verify button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                otp.enteredCode.length < 6 && styles.verifyButtonDisabled,
              ]}
              onPress={async () => {
                const success = await otp.verify();
                if (success) {
                  Alert.alert('Delivery Confirmed', 'OTP verified successfully!', [
                    { text: 'Continue', onPress: () => goBackWithResult('verified') },
                  ]);
                }
              }}
              disabled={otp.enteredCode.length < 6}
            >
              <Text style={styles.verifyButtonText}>Verify Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Verified state */}
        {otp.status === 'verified' && (
          <View style={styles.successSection}>
            <Text style={styles.successIcon}>&#10003;</Text>
            <Text style={styles.successTitle}>Delivery Confirmed</Text>
            <Text style={styles.successSubtitle}>
              OTP verified at stop #{waypointIndex + 1}
            </Text>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => goBackWithResult('verified')}
            >
              <Text style={styles.continueButtonText}>Continue Route</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Failed state */}
        {otp.status === 'failed' && (
          <View style={styles.failedSection}>
            <Text style={styles.failedTitle}>Verification Failed</Text>
            <Text style={styles.failedSubtitle}>
              Maximum attempts reached or code expired.
            </Text>
            <View style={styles.failedActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  otp.reset();
                  otp.generate();
                }}
              >
                <Text style={styles.retryButtonText}>Generate New Code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  Alert.alert(
                    'Skip Verification?',
                    'This delivery will be marked as unverified.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Skip', style: 'destructive', onPress: () => goBackWithResult('skipped') },
                    ]
                  );
                }}
              >
                <Text style={styles.skipButtonText}>Skip Verification</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Expired state */}
        {otp.status === 'expired' && (
          <View style={styles.failedSection}>
            <Text style={styles.failedTitle}>Code Expired</Text>
            <Text style={styles.failedSubtitle}>
              The verification code has expired.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                otp.reset();
                otp.generate();
              }}
            >
              <Text style={styles.retryButtonText}>Generate New Code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Metadata */}
        {metadata && Object.keys(metadata).length > 0 && (
          <View style={styles.metadataSection}>
            <Text style={styles.metadataTitle}>Delivery Info</Text>
            {Object.entries(metadata).map(([key, value]) => (
              <Text key={key} style={styles.metadataText}>
                {key}: {value}
              </Text>
            ))}
          </View>
        )}

        {/* Cancel Delivery */}
        {otp.status !== 'verified' && (
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.cancelDeliveryButton}
              onPress={() => {
                Alert.alert(
                  'Cancel Delivery?',
                  'The product will need to be returned. This stop will be marked as cancelled.',
                  [
                    { text: 'Keep Trying', style: 'cancel' },
                    { text: 'Cancel Delivery', style: 'destructive', onPress: () => goBackWithResult('cancelled') },
                  ]
                );
              }}
            >
              <Text style={styles.cancelDeliveryText}>Cancel Delivery &amp; Return Product</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'Initializing',
  generating: 'Generating Code',
  sent: 'Code Sent to Customer',
  awaiting_entry: 'Awaiting Code Entry',
  verifying: 'Verifying',
  verified: 'Verified',
  failed: 'Failed',
  expired: 'Expired',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 24,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  otpSection: {
    flex: 1,
  },
  demoCodeBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  demoLabel: {
    fontSize: 12,
    color: '#F57F17',
    fontWeight: '600',
    marginBottom: 8,
  },
  demoCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E65100',
    letterSpacing: 8,
  },
  demoHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
  },
  timerValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34A853',
  },
  timerWarning: {
    color: '#EA4335',
  },
  entryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 8,
    color: '#1a1a1a',
    backgroundColor: '#F8F9FA',
    marginBottom: 12,
  },
  attemptsText: {
    fontSize: 13,
    color: '#EA4335',
    textAlign: 'center',
    marginBottom: 8,
  },
  verifyButton: {
    backgroundColor: '#34A853',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyButtonDisabled: {
    backgroundColor: '#A8D5BA',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    fontSize: 64,
    color: '#34A853',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  continueButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginTop: 20,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  failedSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  failedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EA4335',
  },
  failedSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  failedActions: {
    gap: 12,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
  },
  metadataSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  metadataText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  bottomActions: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  cancelDeliveryButton: {
    backgroundColor: '#FCECEA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelDeliveryText: {
    color: '#EA4335',
    fontSize: 15,
    fontWeight: '600',
  },
});

const statusStyles: Record<string, object> = {
  idle: { backgroundColor: '#F0F0F0' },
  generating: { backgroundColor: '#E8F0FE' },
  sent: { backgroundColor: '#E8F5E9' },
  awaiting_entry: { backgroundColor: '#FFF3E0' },
  verifying: { backgroundColor: '#E8F0FE' },
  verified: { backgroundColor: '#E8F5E9' },
  failed: { backgroundColor: '#FCECEA' },
  expired: { backgroundColor: '#FFF3E0' },
};

const statusTextStyles: Record<string, object> = {
  idle: { color: '#666' },
  generating: { color: '#4285F4' },
  sent: { color: '#34A853' },
  awaiting_entry: { color: '#F9AB00' },
  verifying: { color: '#4285F4' },
  verified: { color: '#34A853' },
  failed: { color: '#EA4335' },
  expired: { color: '#F9AB00' },
};
