
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://172.18.204.10:5000';

type ServiceRequest = {
  _id: string;
  serviceType: string;
  description?: string;
  address: string;
  status: string;
  customer?: {
    name?: string;
    mobile?: string;
  };
};

export default function ProviderHome() {
  const [available, setAvailable] = useState(true);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [acceptedRequests, setAcceptedRequests] = useState<ServiceRequest[]>([]);
const [acceptedLoading, setAcceptedLoading] = useState(true);


const [currentLocation, setCurrentLocation] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);

const [locationAddress, setLocationAddress] = useState('');
const [locationError, setLocationError] = useState('');
const [locationLoading, setLocationLoading] = useState(true);

const mapRef = useRef<MapView>(null);

  const getToken = async () => {
    return await SecureStore.getItemAsync('serviq_token');
  };


  const loadRequests = useCallback(async () => {
    if (!available) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      

      const token = await getToken();

      if (!token) {
        Alert.alert('Login required', 'Please log in again.');
        router.replace('/login');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/service-requests/available`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      console.log('Provider API status:', response.status);
console.log('Provider API result:', JSON.stringify(result));
      if (!response.ok) {
        throw new Error(result.message || 'Could not load requests.');
      }

      // Supports common response formats from the backend.
      const list = Array.isArray(result)
        ? result
        : result.requests ?? result.data?.requests ?? result.data ?? [];

      setRequests(Array.isArray(list) ? list : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Request loading failed', message);
    } finally {
      setLoading(false);
    }
  }, [available]);

  

const loadAcceptedRequests = useCallback(async () => {
  try {
    setAcceptedLoading(true);

    const token = await SecureStore.getItemAsync('serviq_token');

    if (!token) {
      setAcceptedRequests([]);
      return;
    }

    const response = await fetch(
      `${API_URL}/api/service-requests/my-requests`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || 'Could not load accepted requests.'
      );
    }

    setAcceptedRequests(
      Array.isArray(result.requests) ? result.requests : []
    );
  } catch (error) {
    console.log('Accepted requests error:', error);

    Alert.alert(
      'History loading failed',
      error instanceof Error
        ? error.message
        : 'Could not load accepted requests.'
    );
  } finally {
    setAcceptedLoading(false);
  }
}, []);

const updateRequestStatus = async (
  request: ServiceRequest,
  status: 'in_progress' | 'completed'
) => {
  try {
    setBusyId(request._id);

    const token = await SecureStore.getItemAsync('serviq_token');

    if (!token) {
      router.replace('/login');
      return;
    }

    const response = await fetch(
      `${API_URL}/api/service-requests/${request._id}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Could not update status.');
    }

    await loadAcceptedRequests();

    Alert.alert(
      'Success',
      `Request marked as ${status.replace('_', ' ')}.`
    );
  } catch (error) {
    Alert.alert(
      'Update failed',
      error instanceof Error
        ? error.message
        : 'Please try again.'
    );
  } finally {
    setBusyId(null);
  }
};


const saveProviderLocation = async (
  latitude: number,
  longitude: number
) => {
  const token = await SecureStore.getItemAsync('serviq_token');

  if (!token) return;

  const response = await fetch(
    `${API_URL}/api/service-requests/provider-location`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latitude, longitude }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Could not save GPS location.');
  }

  console.log('Provider GPS saved:', latitude, longitude);
};


useEffect(() => {
  let subscription: Location.LocationSubscription | null = null;
  let mounted = true;

  const startLocationTracking = async () => {
    try {
      setLocationLoading(true);
      setLocationError('');

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        if (mounted) {
          setLocationError(
            'Location permission denied. Enable it in phone settings.'
          );
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!mounted) return;

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCurrentLocation(coords);
      await saveProviderLocation(
  coords.latitude,
  coords.longitude
);

      const addresses = await Location.reverseGeocodeAsync(coords);

      if (mounted && addresses.length > 0) {
        const place = addresses[0];
        setLocationAddress(
          [
            place.name,
            place.street,
            place.city,
            place.region,
          ]
            .filter(Boolean)
            .filter((value, index, array) =>
              array.indexOf(value) === index
            )
            .join(', ')
        );
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (newPosition) => {
          if (!mounted) return;

          const newCoords = {
            latitude: newPosition.coords.latitude,
            longitude: newPosition.coords.longitude,
          };

          setCurrentLocation(newCoords);
          try {
  await saveProviderLocation(
    newCoords.latitude,
    newCoords.longitude
  );
} catch (error) {
  console.log('GPS sync failed:', error);
}

          const newAddresses =
            await Location.reverseGeocodeAsync(newCoords);

          if (mounted && newAddresses.length > 0) {
            const place = newAddresses[0];
            setLocationAddress(
              [place.name, place.street, place.city, place.region]
                .filter(Boolean)
                .filter((value, index, array) =>
                  array.indexOf(value) === index
                )
                .join(', ')
            );
          }
        }
      );
    } catch (error) {
      console.log('Provider GPS error:', error);

      if (mounted) {
        setLocationError(
          'Unable to get your location. Check GPS and try again.'
        );
      }
    } finally {
      if (mounted) setLocationLoading(false);
    }
  };

  startLocationTracking();

  return () => {
    mounted = false;
    subscription?.remove();
  };
}, []);


useEffect(() => {
  loadRequests();
  loadAcceptedRequests();
}, [loadRequests, loadAcceptedRequests]);

  const acceptRequest = async (request: ServiceRequest) => {
    try {
      setBusyId(request._id);

      const token = await getToken();

      const response = await fetch(
        `${API_URL}/api/service-requests/${request._id}/accept`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not accept this request.');
      }

      setRequests((current) =>
        current.filter((item) => item._id !== request._id)
      );

      await loadAcceptedRequests();
      router.push({
        pathname: '/provider/request',
        params: {
          serviceType: request.serviceType,
          status: 'Accepted',
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not accept request', message);
      loadRequests();
    } finally {
      setBusyId(null);
    }
  };

  const rejectRequest = async (request: ServiceRequest) => {
    try {
      setBusyId(request._id);

      const token = await getToken();

      const response = await fetch(
        `${API_URL}/api/service-requests/${request._id}/reject`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Could not reject this request.');
      }

      // Hide it from this provider's current screen.
      setRequests((current) =>
        current.filter((item) => item._id !== request._id)
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not reject request', message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
    
      <View style={styles.header}>
        <View>
          <Text style={styles.smallText}>Welcome back</Text>
          <Text style={styles.title}>Service Provider</Text>
        </View>

        <View style={styles.profile}>
          <Text style={styles.profileText}>🛠️</Text>
        </View>
      </View>

      <View style={styles.availabilityCard}>
        <View>
          <Text style={styles.availabilityTitle}>
            Service Availability
          </Text>
          <Text style={styles.availabilityStatus}>
            {available ? 'You are available' : 'You are offline'}
          </Text>
        </View>

        <Switch
          value={available}
          onValueChange={setAvailable}
          trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
          thumbColor={available ? '#166534' : '#64748B'}
        />
      </View>

      
<View style={styles.locationCard}>
  <Text style={styles.locationIcon}>📍</Text>

  <View style={{ flex: 1 }}>
    <Text style={styles.locationLabel}>Your Current Location</Text>

    <Text style={styles.locationText}>
      {locationLoading
        ? 'Getting your GPS location...'
        : locationError
          ? locationError
          : locationAddress || 'GPS location detected'}
    </Text>

    {currentLocation && (
      <Text style={styles.coordinatesText}>
        {currentLocation.latitude.toFixed(6)},{' '}
        {currentLocation.longitude.toFixed(6)}
      </Text>
    )}
  </View>
</View>

<View style={styles.mapCard}>
  <Text style={styles.mapTitle}>Your Location on Map</Text>

  {currentLocation ? (
    <MapView
      ref={mapRef}
      style={styles.providerMap}
      initialRegion={{
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation
      showsMyLocationButton
      loadingEnabled
    >
      <Marker
        coordinate={currentLocation}
        title="Your Current Location"
        description={locationAddress || 'Service Provider'}
        pinColor="#166534"
      />
    </MapView>
  ) : (
    <View style={styles.mapPlaceholder}>
      <ActivityIndicator size="large" color="#166534" />
      <Text style={styles.offlineText}>
        {locationError || 'Loading your map...'}
      </Text>
    </View>
  )}
</View>


      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Incoming Requests</Text>
        <TouchableOpacity onPress={loadRequests} disabled={loading}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {!available ? (
        <View style={styles.offlineCard}>
          <Text style={styles.offlineIcon}>💤</Text>
          <Text style={styles.offlineTitle}>
            You are currently offline
          </Text>
          <Text style={styles.offlineText}>
            Turn on availability to receive service requests.
          </Text>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#166534" />
      ) : requests.length === 0 ? (
        <View style={styles.offlineCard}>
          <Text style={styles.offlineIcon}>📭</Text>
          <Text style={styles.offlineTitle}>No pending requests</Text>
          <Text style={styles.offlineText}>
            New matching requests will appear here. Tap Refresh to check again.
          </Text>
        </View>
      ) : (
        requests.map((request) => (
          <View key={request._id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>
                  🔧 {request.serviceType}
                </Text>
                <Text style={styles.requestTime}>New request</Text>
              </View>

              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>Nearby</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.customerLabel}>Customer Requirement</Text>
            <Text style={styles.description}>
              {request.description || 'No additional details provided.'}
            </Text>

            {request.customer?.name ? (
              <Text style={styles.customerDetail}>
                Customer: {request.customer.name}
              </Text>
            ) : null}

            <View style={styles.locationRow}>
              <Text>📍</Text>
              <Text style={styles.address}>{request.address}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.rejectButton}
                disabled={busyId !== null}
                onPress={() => rejectRequest(request)}
              >
                <Text style={styles.rejectText}>
                  {busyId === request._id ? 'Please wait…' : 'Reject'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptButton}
                disabled={busyId !== null}
                onPress={() => acceptRequest(request)}
              >
                <Text style={styles.acceptText}>
                  {busyId === request._id ? 'Please wait…' : 'Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>My Accepted Requests</Text>

  <TouchableOpacity
    onPress={loadAcceptedRequests}
    disabled={acceptedLoading}
  >
    <Text style={styles.refreshText}>Refresh</Text>
  </TouchableOpacity>
</View>

{acceptedLoading ? (
  <ActivityIndicator size="large" color="#166534" />
) : acceptedRequests.length === 0 ? (
  <View style={styles.offlineCard}>
    <Text style={styles.offlineIcon}>📋</Text>
    <Text style={styles.offlineTitle}>
      No accepted requests yet
    </Text>
    <Text style={styles.offlineText}>
      Requests you accept will appear here.
    </Text>
  </View>
) : (
  acceptedRequests.map((request) => (
    <View key={request._id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>
            🔧 {request.serviceType}
          </Text>
          <Text style={styles.requestTime}>
            Your service request
          </Text>
        </View>

        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>
            {request.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.customerLabel}>Customer Requirement</Text>
      <Text style={styles.description}>
        {request.description || 'No additional details provided.'}
      </Text>

      {request.customer?.name ? (
        <Text style={styles.customerDetail}>
          Customer: {request.customer.name}
        </Text>
      ) : null}

      {request.customer?.mobile ? (
        <Text style={styles.customerDetail}>
          Mobile: {request.customer.mobile}
        </Text>
      ) : null}

      <View style={styles.locationRow}>
        <Text>📍</Text>
        <Text style={styles.address}>{request.address}</Text>
      </View>
      
<View style={styles.actions}>
  {request.status === 'accepted' ? (
    <TouchableOpacity
      style={styles.acceptButton}
      disabled={busyId !== null}
      onPress={() => updateRequestStatus(request, 'in_progress')}
    >
      <Text style={styles.acceptText}>
        {busyId === request._id ? 'Please wait…' : 'Start Service'}
      </Text>
    </TouchableOpacity>
  ) : null}

  {request.status === 'in_progress' ? (
    <TouchableOpacity
      style={styles.acceptButton}
      disabled={busyId !== null}
      onPress={() => updateRequestStatus(request, 'completed')}
    >
      <Text style={styles.acceptText}>
        {busyId === request._id ? 'Please wait…' : 'Mark Completed'}
      </Text>
    </TouchableOpacity>
  ) : null}
</View>

    </View>
  ))
)}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingTop: 55, paddingBottom: 35 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallText: { color: '#64748B', fontSize: 14 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  profile: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: { fontSize: 23 },
  availabilityCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 18,
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  availabilityTitle: { fontSize: 16, fontWeight: 'bold' },
  availabilityStatus: { color: '#166534', marginTop: 5 },
  locationCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 16,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: { fontSize: 25, marginRight: 12 },
  locationLabel: { fontSize: 12, color: '#64748B' },
  locationText: { marginTop: 3, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 21, fontWeight: 'bold' },
  refreshText: { color: '#166534', fontWeight: 'bold' },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 15,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfo: { flex: 1, marginRight: 8 },
  serviceName: { fontSize: 18, fontWeight: 'bold' },
  requestTime: { color: '#64748B', marginTop: 5 },
  distanceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  distanceText: { color: '#166534', fontWeight: 'bold' },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 18,
  },
  customerLabel: { fontSize: 13, color: '#64748B' },
  description: { fontSize: 15, marginTop: 6, lineHeight: 21 },
  customerDetail: { marginTop: 10, color: '#475569' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  address: { marginLeft: 8, color: '#475569', flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  rejectButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectText: { color: '#DC2626', fontWeight: 'bold' },
  acceptButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#166534',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptText: { color: 'white', fontWeight: 'bold' },
  offlineCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 18,
    alignItems: 'center',
  },
  offlineIcon: { fontSize: 40 },
  offlineTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  offlineText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  
coordinatesText: {
  color: '#64748B',
  fontSize: 11,
  marginTop: 5,
},

mapCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 15,
  padding: 12,
  marginTop: 15,
  elevation: 2,
  overflow: 'hidden',
},

mapTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#0F172A',
  marginBottom: 12,
},

providerMap: {
  width: '100%',
  height: 230,
  borderRadius: 12,
},

mapPlaceholder: {
  height: 230,
  justifyContent: 'center',
  alignItems: 'center',
  gap: 12,
  padding: 15,
  backgroundColor: '#F1F5F9',
  borderRadius: 12,
},

});
