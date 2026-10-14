
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://172.18.204.10:5000';

type ServiceRequest = {
  _id: string;
  serviceType: string;
  description?: string;
  address?: string;
  status: string;
  createdAt?: string;
  provider?: {
    name?: string;
    mobile?: string;
  } | null;
};

const statusLabels: Record<string, string> = {
  pending: 'Waiting for provider',
  accepted: 'Provider accepted',
  in_progress: 'Service in progress',
  completed: 'Service completed',
  rejected: 'Request rejected',
  cancelled: 'Request cancelled',
};

export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await SecureStore.getItemAsync('serviq_token');

      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/service-requests/customer-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not load requests.');
      }

      setRequests(Array.isArray(result.requests) ? result.requests : []);
    } catch (error) {
      Alert.alert(
        'Loading failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
  useCallback(() => {
    // Load immediately when the screen opens.
    loadRequests();

    // Refresh status every 5 seconds in the background.
    const intervalId = setInterval(() => {
      loadRequests(true);
    }, 5000);

    // Stop polling when the customer leaves this screen.
    return () => {
      clearInterval(intervalId);
    };
  }, [loadRequests])
);

  const renderRequest = ({ item }: { item: ServiceRequest }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.serviceName}>{item.serviceType}</Text>
        <Text style={styles.status}>
          {statusLabels[item.status] || item.status}
        </Text>
      </View>

      {!!item.description && (
        <Text style={styles.detail}>Details: {item.description}</Text>
      )}

      {!!item.address && (
        <Text style={styles.detail}>Location: {item.address}</Text>
      )}

      {!!item.provider && (
        <View style={styles.providerBox}>
          <Text style={styles.providerTitle}>Your service provider</Text>
          <Text style={styles.detail}>
            {item.provider.name || 'Provider assigned'}
          </Text>
          {!!item.provider.mobile && (
            <Text style={styles.detail}>
              Mobile: {item.provider.mobile}
            </Text>
          )}
        </View>
      )}

      {!!item.createdAt && (
        <Text style={styles.date}>
          Requested: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.loadingText}>Loading your requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Service Requests</Text>
      <Text style={styles.subtitle}>
        Track the progress of your requested services.
      </Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        renderItem={renderRequest}
        contentContainerStyle={
          requests.length === 0 ? styles.emptyContainer : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRequests(true)}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            You have not requested any services yet.
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: 55,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    color: '#64748B',
  },
  list: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    gap: 8,
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  status: {
    color: '#0F766E',
    fontWeight: '600',
  },
  detail: {
    color: '#475569',
    marginTop: 6,
  },
  providerBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  providerTitle: {
    fontWeight: '600',
    color: '#0F172A',
  },
  date: {
    marginTop: 12,
    fontSize: 12,
    color: '#94A3B8',
  },
  backButton: {
    backgroundColor: '#0F766E',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
