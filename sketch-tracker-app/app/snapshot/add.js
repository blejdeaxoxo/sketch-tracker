import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LightSensor } from 'expo-sensors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config';

export default function AddSnapshot() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams(); 
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [illuminance, setIlluminance] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    LightSensor.setUpdateInterval(500);

    const subscription = LightSensor.addListener(data => {
      setIlluminance(data.illuminance);
    });

    return () => subscription && subscription.remove();
  }, []);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 10 }}>We need your camera permission</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7, 
        });
        
        if (illuminance < 50) {
          Alert.alert("Lighting Warning", "It is very dark (" + Math.round(illuminance) + " lux). This might affect your score. Continue?", [
            { text: "Retake", style: "cancel" },
            { text: "Keep", onPress: () => setCapturedImage(photo) }
          ]);
        } else {
          setCapturedImage(photo);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');

      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('luminosity_index', illuminance.toFixed(2));
      formData.append('image', {
        uri: capturedImage.uri,
        type: 'image/jpeg',
        name: 'snapshot.jpg',
      });

      const response = await axios.post(`${API_URL}/snapshots`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      const score = parseFloat(response.data.ssim_score).toFixed(3);
      Alert.alert("Success!", `Snapshot saved.\nSimilarity Score: ${score}`, [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to upload snapshot.');
    } finally {
      setUploading(false);
    }
  };

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage.uri }} style={styles.preview} />
        <View style={styles.controls}>
          <TouchableOpacity style={styles.retakeBtn} onPress={() => setCapturedImage(null)}>
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Analyze Sketch</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        
        {/* Sensor Overlay */}
        <View style={styles.sensorOverlay}>
          <Ionicons name={illuminance > 100 ? "sunny" : "moon"} size={24} color="#fff" />
          <Text style={styles.sensorText}>
            Lighting: {Math.round(illuminance)} lux
          </Text>
          {illuminance < 50 && <Text style={styles.warningText}>⚠️ Too Dark</Text>}
        </View>

        {/* Capture Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>

      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  camera: { flex: 1 },
  
  sensorOverlay: {
    position: 'absolute', top: 50, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10
  },
  sensorText: { color: '#fff', fontWeight: 'bold' },
  warningText: { color: '#ff4444', fontWeight: 'bold', marginLeft: 5 },

  bottomBar: {
    position: 'absolute', bottom: 50, left: 0, right: 0,
    alignItems: 'center'
  },
  captureBtn: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center'
  },
  captureInner: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff'
  },

  preview: { flex: 1, resizeMode: 'contain' },
  controls: {
    position: 'absolute', bottom: 40, flexDirection: 'row', width: '100%',
    justifyContent: 'space-around', paddingHorizontal: 20
  },
  retakeBtn: { padding: 15 },
  retakeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  uploadBtn: { backgroundColor: '#f4511e', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 },
  btn: { backgroundColor: '#f4511e', padding: 15, borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});