import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../src/api';
import { initEcho } from '../../src/echo';

// ── Design Tokens (Tema Emerald/Mint Material 3) ──
const C = {
  surface: '#f9f9f8', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#f3f4f3',
  surfaceContainer: '#edeeed', surfaceContainerHigh: '#e7e8e7',
  onSurface: '#191c1c', onSurfaceVariant: '#414844',
  outline: '#717973', outlineVariant: '#c1c8c2',
  primary: '#012d1d', onPrimary: '#ffffff', primaryContainer: '#1b4332',
  onPrimaryContainer: '#86af99', primaryFixed: '#c1ecd4', onPrimaryFixed: '#012d1d', primaryFixedDim: '#a5d0b9',
  secondary: '#4c6452', onSecondary: '#ffffff', secondaryContainer: '#cce6d0',
  secondaryFixed: '#cee9d3', onSecondaryFixed: '#092012', secondaryFixedDim: '#b3cdb7',
  background: '#f9f9f8', onBackground: '#191c1c',
  online: '#10b981', offline: '#9ca3af'
} as const;

interface ChatMessage {
  id: number | string;
  sender: 'pasien' | 'nakes';
  pesan: string;
  waktu: string;
  file_url?: string;
  file_type?: string;
}

export default function PatientChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const konsultasiId: number = route.params?.konsultasiId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Media states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Voice note preview states
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  
  // State Dinamis (Pintar)
  const [myRole, setMyRole] = useState<'pasien' | 'nakes'>('pasien');
  const [opponentName, setOpponentName] = useState<string>('Memuat...');
  const [opponentRole, setOpponentRole] = useState<string>('-');
  const [opponentUserId, setOpponentUserId] = useState<number | null>(null);
  const [chatKategori, setChatKategori] = useState<string>('booking');
  const [chatStatus, setChatStatus] = useState<string>('aktif');
  
  // Status Online (Polling)
  const [isOpponentOnlinePolled, setIsOpponentOnlinePolled] = useState<boolean>(false);

  // ── HELPER AJAIB UNTUK URL MEDIA ──
  const getMediaUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('file')) return url;
    // Hapus baseUrl API dan ganti dengan storage (Sesuaikan dengan backend Laragon-mu)
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://127.0.0.1:8000';
    return `${baseUrl}/file/${url}`;
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${konsultasiId}/messages`);
      if (res.data.status === 'success') {
        const data = res.data.data.konsultasi;
        
        // 1. Tentukan Role Saya & Kategori
        const role = data.current_role || 'pasien';
        setMyRole(role);
        setChatKategori(data.kategori || 'booking');
        setChatStatus(data.status || 'aktif');

        // 2. Set Nama Lawan Bicara di Header
        if (role === 'nakes') {
          setOpponentName(data.pasien_nama || 'Pasien');
          setOpponentRole('Pasien WEAR');
          setOpponentUserId(data.pasien_user_id);
        } else {
          setOpponentName(data.nakes_nama || 'Tenaga Kesehatan');
          setOpponentRole(`✅ ${data.nakes_profesi || 'Nakes'}`);
          setOpponentUserId(data.nakes_user_id);
        }

        // 3. Set Status Online Lawan Bicara
        setIsOpponentOnlinePolled(data.is_opponent_online || false);

        // 4. Filter pesan bot
        const humanMessages = res.data.data.messages.filter((m: any) => m.sender !== 'bot');
        setMessages(humanMessages || []);
      }
    } catch (error: any) {
      console.error('Gagal mengambil chat:', error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishConsultation = () => {
    const msg = "Apakah Anda yakin ingin menyelesaikan sesi konsultasi ini?";
    
    const finishApiCall = async () => {
      try {
        const res = await api.post(`/nakes/consultations/${konsultasiId}/finish`);
        if (res.data.status === 'success') {
          if (Platform.OS !== 'web') Alert.alert("Berhasil", "Sesi konsultasi telah diselesaikan.");
          else window.alert("Sesi konsultasi telah diselesaikan.");
          navigation.goBack();
        }
      } catch (error: any) {
        const errMsg = error.response?.data?.message || "Terjadi kesalahan.";
        if (Platform.OS !== 'web') Alert.alert("Gagal", errMsg);
        else window.alert("Gagal: " + errMsg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        finishApiCall();
      }
    } else {
      Alert.alert("Selesaikan Sesi", msg, [
        { text: "Batal", style: "cancel" },
        { text: "Selesaikan", style: "destructive", onPress: finishApiCall }
      ]);
    }
  };

  useEffect(() => {
    if (!konsultasiId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [konsultasiId]);

  useEffect(() => {
    let echoInstance: any = null;
    const setupWebSocket = async () => {
      if (!konsultasiId) return;
      try {
        echoInstance = await initEcho();
        
        // Private Channel
        echoInstance.private(`konsultasi.${konsultasiId}`)
          .listen('.message.sent', (event: any) => {
            setMessages((prev) => {
              if (prev.some(m => m.id === event.chat.id)) return prev;
              return [...prev, event.chat];
            });
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
          });
          
        // Presence Channel (Dihapus karena sudah diganti sistem Polling di getMessages)

      } catch (err) { console.log('WebSocket error:', err); }
    };
    setupWebSocket();
    return () => { 
      if (echoInstance) {
        echoInstance.leave(`konsultasi.${konsultasiId}`);
        // PENTING: leave() cuma berhenti dengerin channel, socket-nya sendiri
        // tetap terbuka kalau tidak di-disconnect(). Tanpa ini, tiap kali
        // pasien buka-tutup layar chat, 1 koneksi Pusher "bocor" dan tetap
        // makan kuota (100-200 koneksi bersamaan di plan gratis) selamanya
        // sampai app di-kill total - bisa bikin kuota abis sia-sia walau
        // yang benar-benar chat cuma sedikit orang.
        echoInstance.disconnect();
      }
    };
  }, [konsultasiId]);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
      if (previewSound) previewSound.unloadAsync();
    };
  }, [sound, previewSound]);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      handleSend(asset.uri, type);
    }
  };

  const startRecording = async () => {
    try {
      if (recording) return;
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      setRecording(null);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setRecordedAudioUri(uri);
      }
    } catch (err) {
      console.log('Error stopping recording', err);
    }
  };

  const playPreview = async () => {
    if (!recordedAudioUri) return;
    if (previewSound) {
       if (isPlayingPreview) {
          await previewSound.pauseAsync();
          setIsPlayingPreview(false);
       } else {
          await previewSound.playAsync();
          setIsPlayingPreview(true);
       }
       return;
    }
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: recordedAudioUri },
      { shouldPlay: true }
    );
    setPreviewSound(newSound);
    setIsPlayingPreview(true);
    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setIsPlayingPreview(false);
        newSound.setPositionAsync(0);
      }
    });
  };

  const cancelPreview = async () => {
    if (previewSound) {
      await previewSound.unloadAsync();
      setPreviewSound(null);
    }
    setRecordedAudioUri(null);
    setIsPlayingPreview(false);
  };

  const sendPreview = async () => {
    if (recordedAudioUri) {
      await handleSend(recordedAudioUri, 'audio');
      cancelPreview();
    }
  };

  const playAudio = async (uri: string) => {
    if (playingAudio === uri && sound) {
      await sound.stopAsync();
      setPlayingAudio(null);
      return;
    }
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );
    setSound(newSound);
    setPlayingAudio(uri);
    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setPlayingAudio(null);
      }
    });
  };

  const handleSend = async (mediaUri?: string, mediaType?: 'image' | 'video' | 'audio') => {
    const trimmed = newMessage.trim();
    if ((!trimmed && !mediaUri) || isSending) return;

    // ── PERBAIKAN FATAMORGANA (OPTIMISTIC UI) ──
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: myRole, 
      pesan: trimmed, // Biarkan kosong jika yang dikirim hanya media
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      file_url: mediaUri, // Menyimpan URL lokal
      file_type: mediaType, // Memicu UI Audio Player langsung
    };
    
    setMessages((prev) => [...prev, optimistic]);
    if (!mediaUri) setNewMessage('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('konsultasi_id', String(konsultasiId));
      if (trimmed) formData.append('pesan', trimmed);
      
      if (mediaUri) {
        let filename = mediaUri.split('/').pop() || 'upload.jpg';
        let mime = 'image/jpeg';
        if (mediaType === 'video') mime = 'video/mp4';
        if (mediaType === 'audio') { filename = 'audio.m4a'; mime = 'audio/m4a'; }

        if (Platform.OS === 'web') {
          const response = await fetch(mediaUri);
          const blob = await response.blob();
          
          let webExt = blob.type.split('/')[1]?.split(';')[0] || 'webm';
          if (webExt === 'mpeg') webExt = 'mp3';
          
          formData.append('file_lampiran', blob, `upload.${webExt}`);
        } else {
          formData.append('file_lampiran', {
            uri: Platform.OS === 'android' ? mediaUri : mediaUri.replace('file://', ''),
            name: filename,
            type: mime,
          } as any);
        }
      }

      await api.post('/chat/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchMessages();
    } catch (error) {
      setMessages((prev) => prev.filter(m => m.id !== optimistic.id));
      Alert.alert('Gagal', 'Pesan gagal dikirim.');
    } finally {
      setIsSending(false);
    }
  };

  const isOpponentOnline = isOpponentOnlinePolled;

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surfaceContainerLowest} />
      
      {/* HEADER DINAMIS */}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              // Fallback: Navigasi ke tab utama sesuai role
              (navigation as any).navigate(myRole === 'nakes' ? 'NakesChatTab' : 'ChatTab');
            }
          }} style={st.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={C.onSurface} />
          </TouchableOpacity>
          <View style={st.headerAvatar}>
            <MaterialIcons name={myRole === 'nakes' ? 'person' : 'medical-services'} size={22} color={C.onPrimaryFixed} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[st.headerName, { flexShrink: 1 }]} numberOfLines={1}>{opponentName}</Text>
              <View style={[
                st.statusDot, 
                { backgroundColor: isOpponentOnline ? C.online : C.offline }
              ]} />
              <Text style={[
                st.statusText, 
                { color: isOpponentOnline ? C.online : C.offline }
              ]}>
                {isOpponentOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Text style={st.headerRole}>{opponentRole}</Text>
          </View>
        </View>
        {myRole === 'nakes' && chatKategori === 'booking' && chatStatus !== 'selesai' && (
          <TouchableOpacity onPress={handleFinishConsultation} style={st.finishBtn}>
            <MaterialIcons name="check-circle" size={16} color="#10b981" />
            <Text style={st.finishBtnText}>Selesai</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={st.loadingWrap}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={st.chatScroll}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={st.emptyState}>
                <View style={st.emptyIconWrap}>
                  <MaterialIcons name="forum" size={48} color={C.primaryFixed} />
                </View>
                <Text style={st.emptyText}>Mulai Konsultasi</Text>
                <Text style={st.emptySub}>Kirim pesan untuk memulai percakapan.</Text>
              </View>
            )}

            {messages.map((msg) => {
              const isMe = msg.sender === myRole;
              const mediaUrl = getMediaUrl(msg.file_url); // Helper URL

              let finalFileType = msg.file_type;
              if (msg.file_url) {
                const lowerUrl = msg.file_url.toLowerCase();
                if (lowerUrl.endsWith('.m4a') || lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav')) {
                  finalFileType = 'audio';
                } else if (lowerUrl.endsWith('.mp4')) {
                  finalFileType = 'video';
                } else if (lowerUrl.match(/\.(jpeg|jpg|png|gif)$/)) {
                  finalFileType = 'image';
                }
              }

              return (
                <View key={msg.id} style={[st.bubbleRow, isMe && st.bubbleRowRight]}>
                  <View style={[st.bubbleCol, isMe && st.bubbleColRight]}>
                    {!isMe && (
                      <View style={st.senderLabel}>
                        <MaterialIcons name={myRole === 'nakes' ? 'person' : 'medical-services'} size={14} color={C.primary} />
                        <Text style={st.senderLabelText}>{opponentName}</Text>
                      </View>
                    )}
                    
                    <View style={[
                      st.bubble, 
                      isMe ? st.bubbleMe : st.bubbleOpponent,
                      // ── MENGURANGI SPACE KOSONG KHUSUS VOICE NOTE ──
                      (finalFileType === 'audio' && !msg.pesan) && { paddingVertical: 4, paddingHorizontal: 8, minWidth: 160 }
                    ]}>
                      
                      {finalFileType === 'image' && msg.file_url && (
                        <Image source={{ uri: mediaUrl }} style={{ width: 200, height: 200, borderRadius: 8, marginBottom: msg.pesan ? 4 : 0 }} />
                      )}
                      
                      {finalFileType === 'video' && msg.file_url && (
                        <Video
                          source={{ uri: mediaUrl }}
                          style={{ width: 200, height: 200, borderRadius: 8, marginBottom: msg.pesan ? 4 : 0 }}
                          useNativeControls
                          resizeMode={ResizeMode.COVER}
                        />
                      )}
                      
                      {/* Render File Audio / Voice Note PREMIUM DESIGN */}
                      {finalFileType === 'audio' && msg.file_url && (
                        <View style={st.vnMain}>
                          <TouchableOpacity 
                            style={st.vnPlayWrap} 
                            onPress={() => playAudio(mediaUrl)}
                            activeOpacity={0.8}
                          >
                            <Ionicons 
                              name={playingAudio === mediaUrl ? "pause" : "play"} 
                              size={28} 
                              color={isMe ? '#FFFFFF' : C.primary} 
                            />
                          </TouchableOpacity>

                          <View style={st.vnRight}>
                            {/* Garis Progress Base dengan Slider Titik Bulat */}
                            <View style={[st.vnProgressBase, isMe ? { backgroundColor: 'rgba(255,255,255,0.3)' } : { backgroundColor: 'rgba(1, 45, 29, 0.15)' }]}>
                              <View style={[st.vnProgressFill, { width: playingAudio === mediaUrl ? '60%' : '0%' }]} /> 
                              <View style={[st.vnProgressThumb, { left: playingAudio === mediaUrl ? '60%' : '0%' }]} />
                            </View>
                            
                            <View style={st.vnMetaWrap}>
                              <Text style={[st.vnDuration, isMe ? {color: 'rgba(255,255,255,0.8)'} : {color: C.outline}]}>
                                {playingAudio === mediaUrl ? 'Memutar...' : 'Voice Note'}
                              </Text>
                              <MaterialIcons name="mic" size={16} color={isMe ? '#34D399' : C.secondary} />
                            </View>
                          </View>
                        </View>
                      )}

                      {!!msg.pesan && <Text style={[st.bubbleText, isMe && { color: '#ffffff' }]}>{msg.pesan}</Text>}
                    </View>
                    <Text style={[st.timeText, isMe && { textAlign: 'right' }]}>{msg.waktu}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {chatStatus === 'selesai' ? (
          <View style={[st.inputBar, { justifyContent: 'center', paddingVertical: 16 }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.outline, textAlign: 'center' }}>
              Sesi konsultasi ini telah diselesaikan. Anda hanya dapat membaca riwayat chat.
            </Text>
          </View>
        ) : (chatStatus === 'pending' || chatStatus === 'dijadwalkan') ? (
          <View style={[st.inputBar, { justifyContent: 'center', paddingVertical: 16 }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#b45309', textAlign: 'center' }}>
              ⏳ Menunggu konfirmasi dari tenaga kesehatan. Anda belum bisa mengirim pesan.
            </Text>
          </View>
        ) : (
          <View style={st.inputBar}>
          {recordedAudioUri ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceContainerLow, borderRadius: 24, paddingHorizontal: 4, paddingVertical: 4 }}>
               <TouchableOpacity onPress={cancelPreview} style={{ padding: 12 }}>
                 <MaterialIcons name="delete" size={24} color="#ef4444" />
               </TouchableOpacity>
               
               <TouchableOpacity onPress={playPreview} style={{ padding: 8, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                 <MaterialIcons name={isPlayingPreview ? "pause" : "play-arrow"} size={28} color={C.primary} />
                 <Text style={{ marginLeft: 8, color: C.onSurface, fontWeight: '600' }}>Preview Voice Note</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 style={[st.sendBtn, isSending && { opacity: 0.5 }]} 
                 onPress={sendPreview}
                 disabled={isSending}
                 activeOpacity={0.8}
               >
                 {isSending ? <ActivityIndicator size="small" color="#ffffff" /> : <MaterialIcons name="send" size={20} color="#ffffff" style={{ marginLeft: 4 }} />}
               </TouchableOpacity>
            </View>
          ) : (
            <>
              {chatKategori !== 'livechat' && (
                <TouchableOpacity onPress={pickMedia} style={st.attachBtn}>
                  <MaterialIcons name="attach-file" size={24} color={C.outline} />
                </TouchableOpacity>
              )}
              <View style={st.inputWrap}>
                <TextInput
                  style={st.textInput}
                  placeholder={recording ? "Merekam..." : "Tulis pesan..."}
                  placeholderTextColor={recording ? "#ef4444" : C.outline}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  returnKeyType="send"
                  onSubmitEditing={() => handleSend()}
                  multiline
                  editable={!recording}
                />
              </View>
              {newMessage.trim() ? (
                <TouchableOpacity 
                  style={[st.sendBtn, isSending && { opacity: 0.5 }]} 
                  onPress={() => handleSend()} 
                  disabled={isSending}
                  activeOpacity={0.8}
                >
                  {isSending ? <ActivityIndicator size="small" color="#ffffff" /> : <MaterialIcons name="send" size={20} color="#ffffff" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>
              ) : (
                chatKategori !== 'livechat' ? (
                  <TouchableOpacity 
                    style={[st.sendBtn, recording ? { backgroundColor: '#ef4444' } : {}]} 
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name={recording ? "mic-off" : "mic"} size={20} color="#ffffff" />
                  </TouchableOpacity>
                ) : null
              )}
            </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles (Tema Emerald/Mint Material 3) ──
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, 
    backgroundColor: C.surfaceContainerLowest, 
    borderBottomWidth: 1, borderBottomColor: C.outlineVariant, 
    elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 
  },
  backBtn: { padding: 4 },
  headerAvatar: { 
    width: 42, height: 42, borderRadius: 21, 
    backgroundColor: C.primaryFixed, 
    alignItems: 'center', justifyContent: 'center' 
  },
  headerName: { fontSize: 16, fontWeight: '700', color: C.onSurface },
  headerRole: { fontSize: 12, fontWeight: '500', color: C.outline, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  statusText: { fontSize: 11, marginLeft: 4, fontWeight: '600' },
  finishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#a7f3d0'
  },
  finishBtnText: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chatScroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 16 },
  
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surfaceContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { fontSize: 18, fontWeight: '700', color: C.onSurface },
  emptySub: { fontSize: 14, color: C.outline, textAlign: 'center' },
  
  senderLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 },
  senderLabelText: { fontSize: 12, fontWeight: '700', color: C.primary },
  
  bubbleRow: { maxWidth: '85%', marginBottom: 4 },
  bubbleRowRight: { alignSelf: 'flex-end' },
  bubbleCol: { gap: 4 },
  bubbleColRight: { alignItems: 'flex-end' },
  
  bubble: { paddingHorizontal: 16, paddingVertical: 12, maxWidth: '100%' },
  bubbleOpponent: { 
    backgroundColor: C.surfaceContainerLow, 
    borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: C.outlineVariant 
  },
  bubbleMe: { 
    backgroundColor: C.primary, 
    borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 4,
    elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 
  },
  
  bubbleText: { fontSize: 15, lineHeight: 22, color: C.onSurface },
  timeText: { fontSize: 11, color: C.outline, marginHorizontal: 4, fontWeight: '500' },
  
  inputBar: { 
    flexDirection: 'row', alignItems: 'center', gap: 12, 
    paddingHorizontal: 16, paddingVertical: 12, 
    backgroundColor: C.surfaceContainerLowest, 
    borderTopWidth: 1, borderTopColor: C.outlineVariant 
  },
  attachBtn: { padding: 4 },
  inputWrap: { flex: 1 },
  textInput: { 
    backgroundColor: C.surfaceContainerLow, 
    borderRadius: 24, 
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, 
    fontSize: 15, color: C.onSurface, 
    maxHeight: 120, 
    borderWidth: 1, borderColor: C.outlineVariant 
  },
  sendBtn: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: C.primary, 
    alignItems: 'center', justifyContent: 'center', 
    elevation: 2, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 
  },

  // NEW VOICE NOTE PREMIUM STYLES
  vnMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vnPlayWrap: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vnRight: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  vnProgressBase: {
    height: 3,
    borderRadius: 2,
    width: '100%',
    position: 'relative',
  },
  vnProgressFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    backgroundColor: '#34D399', // Hijau terang nyala
    borderRadius: 2,
  },
  vnProgressThumb: {
    position: 'absolute',
    top: -3.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
    marginLeft: -5,
  },
  vnMetaWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -2,
  },
  vnDuration: {
    fontSize: 11,
    fontWeight: '600',
  },
});
