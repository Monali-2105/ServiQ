
import { router, useLocalSearchParams } from 'expo-router';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProviderRequest() {
  const params = useLocalSearchParams<{
    serviceType?: string;
    distance?: string;
    status?: string;
  }>();

  const serviceType = params.serviceType || 'Service';
  const distance = params.distance || 'Not available';
  const status = params.status || 'Accepted';

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✅</Text>

      <Text style={styles.title}>Request Accepted</Text>

      <Text style={styles.description}>
        You have accepted the {serviceType.toLowerCase()} service request.
        You can now proceed to the customer's location.
      </Text>

      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{serviceType}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>{distance}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/provider/home')}
      >
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  icon: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginTop: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  label: {
    color: '#64748B',
  },
  value: {
    fontWeight: 'bold',
  },
  status: {
    color: '#166534',
    fontWeight: 'bold',
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#166534',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
