import { useState, useCallback } from 'react';
import { 
  View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Dimensions, Modal, StatusBar 
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { API_URL, BASE_URL } from '../../config';

const screenWidth = Dimensions.get('window').width;

export default function ProjectDetail() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false); 

  useFocusEffect(
    useCallback(() => {
      fetchProjectDetails();
    }, [])
  );

  const fetchProjectDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${API_URL}/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProject(response.data);
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f4511e" /></View>;
  if (!project) return <View style={styles.center}><Text>Project not found</Text></View>;

  const scores = project.snapshots.map(s => parseFloat(s.ssim_score));
  const chartData = {
    labels: project.snapshots.map((_, i) => (i + 1).toString()), 
    datasets: [{ data: scores.length > 0 ? scores : [0] }]
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 1. Reference Image Header (Clickable) */}
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.9}>
            <Image 
              source={{ uri: `${BASE_URL}/${project.reference_image_path.replace(/\\/g, '/')}` }} 
              style={styles.refImage} 
            />
          </TouchableOpacity>
          <View style={styles.titleOverlay}>
            <Text style={styles.projectTitle}>{project.title}</Text>
            <Text style={styles.projectCategory}>{project.category}</Text>
            <Text style={styles.tapHint}>Tap image to enlarge</Text>
          </View>
        </View>

        {/* 2. Progress Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress (Similarity Score)</Text>
          {scores.length > 0 ? (
            <LineChart
              data={chartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(244, 81, 30, ${opacity})`, // Orange theme
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                propsForDots: { r: '4', strokeWidth: '2', stroke: '#f4511e' }
              }}
              style={styles.chart}
              bezier 
            />
          ) : (
            <Text style={styles.noDataText}>No snapshots yet. Start drawing!</Text>
          )}
        </View>

        {/* 3. Snapshot History List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snapshot History</Text>
          {project.snapshots.map((snap, index) => (
            <View key={snap.id} style={styles.snapshotRow}>
              <Image 
                source={{ uri: `${BASE_URL}/${snap.image_path.replace(/\\/g, '/')}` }} 
                style={styles.thumb} 
              />
              <View style={styles.snapInfo}>
                <Text style={styles.snapDate}>Attempt #{index + 1}</Text>
                <Text style={styles.snapScore}>Score: {parseFloat(snap.ssim_score).toFixed(3)}</Text>
                <Text style={styles.snapLight}>Light: {snap.luminosity_index} lux</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} /> 
      </ScrollView>

      {/* 4. Floating Button to Add Snapshot */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push({ pathname: '/snapshot/add', params: { projectId: id } })}
      >
        <Ionicons name="camera" size={30} color="#fff" />
      </TouchableOpacity>

      {/* 5. Full Screen Image Modal */}
      <Modal 
        visible={modalVisible} 
        transparent={true} 
        animationType="fade"
        onRequestClose={() => setModalVisible(false)} // Handle Android Back Button
      >
        <View style={styles.modalContainer}>
          <StatusBar hidden />
          
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>

          <Image 
            source={{ uri: `${BASE_URL}/${project.reference_image_path.replace(/\\/g, '/')}` }} 
            style={styles.fullScreenImage} 
          />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 20 },
  
  imageContainer: { position: 'relative', marginBottom: 20 },
  refImage: { width: '100%', height: 250, resizeMode: 'cover' },
  titleOverlay: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 15 
  },
  projectTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  projectCategory: { color: '#ddd', fontSize: 14 },
  tapHint: { color: '#ccc', fontSize: 12, marginTop: 4, fontStyle: 'italic' },

  section: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, padding: 15, borderRadius: 12, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  chart: { marginVertical: 8, borderRadius: 16 },
  noDataText: { textAlign: 'center', color: '#999', padding: 20 },

  snapshotRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  thumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  snapInfo: { marginLeft: 15 },
  snapDate: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  snapScore: { color: '#f4511e', fontWeight: 'bold' },
  snapLight: { color: '#666', fontSize: 12 },

  fab: {
    position: 'absolute', right: 20, bottom: 20,
    backgroundColor: '#f4511e', width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', elevation: 5
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  }
});