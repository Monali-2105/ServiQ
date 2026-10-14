
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useMemo, useState } from 'react';
import * as Location from 'expo-location';
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const services = [
  { id: '1', name: 'Plumber', icon: '🔧' },
  { id: '2', name: 'Electrician', icon: '⚡' },
  { id: '3', name: 'Carpenter', icon: '🪚' },
  { id: '4', name: 'Cleaner', icon: '🧹' },
  { id: '5', name: 'Painter', icon: '🎨' },
  { id: '6', name: 'Gardener', icon: '🌱' },
  { id: '7', name: 'Driver', icon: '🚗' },
  { id: '8', name: 'Technician', icon: '🛠️' },
];

// Initial problem-to-service matching.
// This can later be replaced with an NLP/AI model.
const problemKeywords: Record<string, string[]> = {
  Plumber: [
    'tap', 'leak', 'leaking', 'pipe', 'water', 'faucet',
    'drain', 'toilet', 'sink', 'plumbing', 'flush',
  ],
  Electrician: [
    'electric', 'electrical', 'switch', 'wire', 'wiring',
    'fan', 'light', 'bulb', 'socket', 'power', 'sparking',
    'short circuit',
  ],
  Carpenter: [
    'wood', 'wooden', 'door', 'furniture', 'chair',
    'table', 'cupboard', 'cabinet', 'drawer', 'carpenter',
  ],
  Cleaner: [
    'clean', 'cleaning', 'dirty', 'dust', 'housekeeping',
    'deep cleaning', 'washroom',
  ],
  Painter: [
    'paint', 'painting', 'wall', 'colour', 'color',
    'peeling', 'wallpaper',
  ],
  Gardener: [
    'garden', 'plant', 'plants', 'grass', 'lawn',
    'pruning', 'trimming', 'gardener',
  ],
  Driver: [
    'driver', 'driving', 'pickup', 'pick up', 'drop',
    'travel', 'transport',
  ],
  Technician: [
    'technician', 'repair', 'installation', 'install',
    'machine', 'appliance', 'washing machine', 'ac',
    'refrigerator', 'fridge', 'computer',
  ],
};

export default function UserHome() {
  const [problem, setProblem] = useState('');

  const recommendedServices = useMemo(() => {
    const query = problem.trim().toLowerCase();

    if (!query) return [];

    return services.filter((service) => {
      const keywords = problemKeywords[service.name] ?? [];

      return keywords.some((keyword) => {
        // Match complete words or phrases, not just partial words.
        const escaped = keyword.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );
        return new RegExp(`\\b${escaped}\\b`, 'i').test(query);
      });
    });
  }, [problem]);

  const openRequest = (serviceName: string) => {
  setSelectedService(serviceName);

  router.push({
    pathname: '/user/request',
    params: {
      service: serviceName,
      description: problem.trim(),
    },
  });
};


  const [currentLocation, setCurrentLocation] = useState<{
  latitude: number;
  longitude: number;
} | null>(null);

const [selectedService, setSelectedService] = useState('');
const [nearbyProviders, setNearbyProviders] = useState<
  {
    providerId: string;
    name: string;
    mobile?: string;
    serviceType: string;
    latitude: number;
    longitude: number;
    distanceKm: number;
  }[]
>([]);
const [providersLoading, setProvidersLoading] = useState(false);
const [providersError, setProvidersError] = useState('');

const [locationAddress, setLocationAddress] = useState(
  'Getting your location...'
);

const [locationError, setLocationError] = useState('');

useEffect(() => {
  let subscription: Location.LocationSubscription | null = null;
  let isMounted = true;

  const startLocationTracking = async () => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (isMounted) {
          setLocationError('Please allow location permission.');
          setLocationAddress('Location permission required');
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!isMounted) return;

      const coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(coordinates);

      try {
        const addresses =
          await Location.reverseGeocodeAsync(coordinates);

        if (isMounted && addresses.length > 0) {
          const place = addresses[0];
          const address = [
            place.name,
            place.street,
            place.district,
            place.city,
          ]
            .filter(Boolean)
            .filter((value, index, array) => array.indexOf(value) === index)
            .join(', ');

          setLocationAddress(address || 'Current location detected');
        } else if (isMounted) {
          setLocationAddress('Current location detected');
        }
      } catch {
        if (isMounted) {
          setLocationAddress('Current location detected');
        }
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (updatedLocation) => {
          if (!isMounted) return;

          setCurrentLocation({
            latitude: updatedLocation.coords.latitude,
            longitude: updatedLocation.coords.longitude,
          });
        }
      );
    } catch (error) {
      console.error('Location error:', error);

      if (isMounted) {
        setLocationError('Unable to get location. Check GPS settings.');
        setLocationAddress('Location unavailable');
      }
    }
  };

  startLocationTracking();

  return () => {
    isMounted = false;
    subscription?.remove();
  };
}, []);


useEffect(() => {
  if (!currentLocation || !selectedService) {
    setNearbyProviders([]);
    setProvidersError('');
    return;
  }

  let cancelled = false;

  const loadNearbyProviders = async () => {
    setProvidersLoading(true);
    setProvidersError('');

    try {
      const token = await SecureStore.getItemAsync('serviq_token');

      if (!token) {
        throw new Error('Please log in to find nearby providers.');
      }

      const params = new URLSearchParams({
        latitude: String(currentLocation.latitude),
        longitude: String(currentLocation.longitude),
        serviceType: selectedService,
        k: '5',
      });

      const response = await fetch(
        `http://172.18.204.10:5000/api/service-requests/nearby?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || 'Unable to find nearby providers.'
        );
      }

      if (!cancelled) {
        setNearbyProviders(data.providers ?? []);
      }
    } catch (error) {
      if (!cancelled) {
        setNearbyProviders([]);
        setProvidersError(
          error instanceof Error
            ? error.message
            : 'Unable to load nearby providers.'
        );
      }
    } finally {
      if (!cancelled) {
        setProvidersLoading(false);
      }
    }
  };

  loadNearbyProviders();

  return () => {
    cancelled = true;
  };
}, [
  currentLocation?.latitude,
  currentLocation?.longitude,
  selectedService,
]);


  return (
    

<ScrollView
  style={styles.container}
  contentContainerStyle={{ paddingBottom: 30 }}
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.userName}>Welcome to ServiQ</Text>
        </View>

        <TouchableOpacity style={styles.profileButton}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>
      

      {/* Location */}
      <View style={styles.locationContainer}>
  <Text style={styles.locationIcon}>📍</Text>

  <View style={{ flex: 1 }}>
    <Text style={styles.locationLabel}>Your Location</Text>
    <Text style={styles.locationText}>
      {locationAddress}
    </Text>
    {locationError ? (
      <Text style={{ color: 'red', marginTop: 4 }}>
        {locationError}
      </Text>
    ) : null}
  </View>
</View>

{currentLocation && (
  <View
    style={{
      height: 220,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
    }}
  >
    <MapView
  style={{ flex: 1 }}
  initialRegion={{
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
  showsUserLocation={true}
  showsMyLocationButton={true}
  loadingEnabled={true}
  onMapReady={() => console.log('ServiQ map is ready')}
>
  <Marker
    coordinate={currentLocation}
    title="Your Location"
    description={locationAddress}
  />
  {nearbyProviders.map((provider) => (
  <Marker
    key={provider.providerId}
    coordinate={{
      latitude: provider.latitude,
      longitude: provider.longitude,
    }}
    title={provider.name}
    description={`${provider.serviceType} • ${provider.distanceKm} km away`}
    pinColor="#16A34A"
  />
))}
</MapView>

{selectedService ? (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ color: '#334155', fontWeight: '600' }}>
      {providersLoading
        ? `Finding nearby ${selectedService.toLowerCase()}s...`
        : `${nearbyProviders.length} nearby provider(s) found`}
    </Text>

    {!!providersError && (
      <Text style={{ color: '#DC2626', marginTop: 4 }}>
        {providersError}
      </Text>
    )}

    {!providersLoading &&
      !providersError &&
      nearbyProviders.length === 0 && (
        <Text style={{ color: '#64748B', marginTop: 4 }}>
          No available providers with saved locations were found for this service.
        </Text>
      )}
  </View>
) : null}
  </View>
)}

      {/* Track requests */}
      <TouchableOpacity
        style={styles.trackButton}
        onPress={() => router.push('/user/my-requests')}
      >
        <Text style={styles.trackButtonText}>
          📋 My Service Requests
        </Text>
      </TouchableOpacity>

      {/* Smart problem search */}
      <Text style={styles.searchTitle}>What do you need help with?</Text>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.search}
          placeholder="Describe your problem..."
          placeholderTextColor="#94A3B8"
          value={problem}
          onChangeText={setProblem}
          returnKeyType="search"
          onSubmitEditing={() => {
            if (recommendedServices.length === 1) {
              openRequest(recommendedServices[0].name);
            }
          }}
        />
        {problem.length > 0 && (
          <TouchableOpacity onPress={() => setProblem('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recommendations */}
      {problem.trim().length > 0 && (
        <View style={styles.recommendationBox}>
          <Text style={styles.recommendationTitle}>
            Recommended services
          </Text>

          {recommendedServices.length > 0 ? (
            recommendedServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.recommendationItem}
                onPress={() => openRequest(service.name)}
              >
                <Text style={styles.recommendationIcon}>
                  {service.icon}
                </Text>

                <View style={styles.recommendationTextContainer}>
                  <Text style={styles.recommendationName}>
                    {service.name}
                  </Text>
                  <Text style={styles.recommendationHint}>
                    Tap to continue with your request
                  </Text>
                </View>

                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noMatch}>
              No service matched yet. Try describing the problem
              differently or select a service below.
            </Text>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Browse Services</Text>

      {/* Existing service cards */}
      
{/* Existing service cards */}
<View style={styles.servicesGrid}>
  {services.map((item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.serviceCard}
      onPress={() => openRequest(item.name)}
    >
      <Text style={styles.serviceIcon}>{item.icon}</Text>
      <Text style={styles.serviceName}>{item.name}</Text>
    </TouchableOpacity>
  ))}
</View>

    </ScrollView>
    
  
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingTop: 55,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 15,
    color: '#64748B',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 3,
  },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 22,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    marginTop: 22,
  },
  locationIcon: {
    fontSize: 23,
    marginRight: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  trackButton: {
    backgroundColor: '#0F766E',
    padding: 15,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  trackButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  search: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: '#0F172A',
  },
  clearButton: {
    fontSize: 18,
    color: '#64748B',
    padding: 5,
  },
  recommendationBox: {
    backgroundColor: 'white',
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  recommendationIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  recommendationTextContainer: {
    flex: 1,
  },
  recommendationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F766E',
  },
  recommendationHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  arrow: {
    fontSize: 26,
    color: '#64748B',
    marginLeft: 8,
  },
  noMatch: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 22,
    marginBottom: 15,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  
serviceCard: {
  width: '48%',
  minHeight: 120,
  marginBottom: 15,
  paddingVertical: 18,
  paddingHorizontal: 10,
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E2E8F0',
},

  serviceIcon: {
    fontSize: 35,
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  
servicesGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'stretch',
},

});
