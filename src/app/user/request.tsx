
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://172.18.204.10:5000';

export default function ServiceRequest() {
  const params = useLocalSearchParams<{
    service?: string;
    description?: string;
  }>();

  const service = params.service || 'Service';

  const [description, setDescription] = useState(
    typeof params.description === 'string'
      ? params.description
      : ''
  );
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const submitRequest = async () => {
    if (!description.trim()) {
      Alert.alert(
        'Description required',
        'Please describe the problem you need help with.'
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert(
        'Address required',
        'Please enter the location where the service is needed.'
      );
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const token = await SecureStore.getItemAsync('serviq_token');

      if (!token) {
        Alert.alert(
          'Login required',
          'Please log in again to submit your request.'
        );
        return;
      }

      const response = await fetch(
        `${API_URL}/api/service-requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            serviceType: service,
            description: description.trim(),
            address: address.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Request creation failed:', data);

        Alert.alert(
          'Request failed',
          data.message || `Server returned status ${response.status}.`
        );
        return;
      }

      Alert.alert(
        'Request submitted',
        'Your service request has been saved. ServiQ can now find a suitable provider.',
        [
          {
            text: 'View My Requests',
            onPress: () => router.replace('/user/my-requests'),
          },
        ]
      );
    } catch (error) {
      console.error('Submit request error:', error);

      Alert.alert(
        'Connection error',
        'Could not connect to the server. Check that your backend is running and your phone is connected to the same Wi-Fi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request a Service</Text>

      <Text style={styles.label}>Selected Service</Text>

      <View style={styles.serviceBox}>
        <Text style={styles.serviceText}>{service}</Text>
      </View>

      <Text style={styles.label}>Describe your requirement</Text>

      <TextInput
        style={styles.description}
        placeholder="Example: My kitchen tap is leaking..."
        placeholderTextColor="#94A3B8"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        editable={!loading}
      />

      <Text style={styles.label}>Service Address</Text>

      <TextInput
        style={styles.addressInput}
        placeholder="Enter your area, street or full address"
        placeholderTextColor="#94A3B8"
        value={address}
        onChangeText={setAddress}
        multiline
        editable={!loading}
      />

      <Text style={styles.info}>
        📍 Your request will be submitted to ServiQ for provider matching.
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.disabledButton]}
        onPress={submitRequest}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Find Nearby Provider
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 25,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  serviceBox: {
    backgroundColor: '#DCFCE7',
    padding: 17,
    borderRadius: 10,
    marginBottom: 22,
  },
  serviceText: {
    color: '#166534',
    fontSize: 17,
    fontWeight: 'bold',
  },
  description: {
    minHeight: 110,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    marginBottom: 20,
    color: '#0F172A',
  },
  addressInput: {
    minHeight: 55,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    marginBottom: 18,
    color: '#0F172A',
  },
  info: {
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 22,
  },
  button: {
    minHeight: 54,
    backgroundColor: '#166534',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
