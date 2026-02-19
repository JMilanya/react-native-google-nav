import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, OTPStatus } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliverySummary'>;

const OTP_BADGE: Record<OTPStatus, { label: string; bg: string; color: string }> = {
  verified: { label: 'OTP Verified', bg: '#E6F4EA', color: '#34A853' },
  cancelled: { label: 'Cancelled / Return', bg: '#FCECEA', color: '#EA4335' },
  skipped: { label: 'Skipped', bg: '#FFF3E0', color: '#F9AB00' },
  pending: { label: 'Pending', bg: '#F0F0F0', color: '#666' },
};

export default function DeliverySummaryScreen({ route, navigation }: Props) {
  const { stops } = route.params;

  const verified = stops.filter((s) => s.otpStatus === 'verified');
  const cancelled = stops.filter((s) => s.otpStatus === 'cancelled');
  const other = stops.filter((s) => s.otpStatus === 'skipped' || s.otpStatus === 'pending');

  const renderStopCard = (stop: (typeof stops)[0], index: number, keyPrefix: string) => {
    const badge = OTP_BADGE[stop.otpStatus];
    return (
      <View key={`${keyPrefix}-${index}`} style={styles.stopCard}>
        <View style={[
          styles.statusDot,
          stop.otpStatus === 'verified' ? styles.statusDotGreen
            : stop.otpStatus === 'cancelled' ? styles.statusDotRed
            : styles.statusDotYellow,
        ]} />
        <View style={styles.stopDetails}>
          <View style={styles.titleRow}>
            <Text style={styles.stopTitle} numberOfLines={1}>{stop.title}</Text>
            <View style={[styles.otpBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.otpBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Package:</Text>
            <Text style={styles.metaValue}>{stop.metadata.packageId || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Customer:</Text>
            <Text style={styles.metaValue}>{stop.metadata.customerName || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Phone:</Text>
            <Text style={styles.metaValue}>{stop.metadata.phone || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Window:</Text>
            <Text style={styles.metaValue}>{stop.metadata.deliveryWindow || '-'}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Delivery Summary</Text>
        <Text style={styles.subtitle}>
          {verified.length} of {stops.length} deliveries verified
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width:
                  stops.length > 0
                    ? `${(verified.length / stops.length) * 100}%`
                    : '0%',
              },
            ]}
          />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={styles.statNumber}>{verified.length}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={[styles.statCard, styles.statCardRed]}>
            <Text style={styles.statNumber}>{cancelled.length}</Text>
            <Text style={styles.statLabel}>Cancelled</Text>
          </View>
          <View style={[styles.statCard, styles.statCardYellow]}>
            <Text style={styles.statNumber}>{other.length}</Text>
            <Text style={styles.statLabel}>Other</Text>
          </View>
        </View>

        {/* Verified Deliveries */}
        {verified.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verified Deliveries</Text>
            {verified.map((stop, i) => renderStopCard(stop, i, 'verified'))}
          </View>
        )}

        {/* Cancelled / Returned */}
        {cancelled.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancelled / Return to Depot</Text>
            {cancelled.map((stop, i) => renderStopCard(stop, i, 'cancelled'))}
          </View>
        )}

        {/* Skipped / Pending */}
        {other.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skipped / Pending</Text>
            {other.map((stop, i) => renderStopCard(stop, i, 'other'))}
          </View>
        )}

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => navigation.popToTop()}
        >
          <Text style={styles.doneButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#FCECEA',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34A853',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statCardGreen: {
    backgroundColor: '#E6F4EA',
  },
  statCardRed: {
    backgroundColor: '#FCECEA',
  },
  statCardYellow: {
    backgroundColor: '#FFF3E0',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  stopCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  statusDotGreen: {
    backgroundColor: '#34A853',
  },
  statusDotRed: {
    backgroundColor: '#EA4335',
  },
  statusDotYellow: {
    backgroundColor: '#F9AB00',
  },
  stopDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stopTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  otpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  otpBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 13,
    color: '#888',
    width: 80,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  doneButton: {
    backgroundColor: '#4285F4',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
