import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, StatusBar, FlatList, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../api';

// ── Design Tokens (DESIGN.md – Serene Assurance) ──
const C = {
  surface: '#f8f9ff', surfaceContainerLowest: '#ffffff', surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e6eeff', surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d5e3fc', surfaceVariant: '#d5e3fc',
  onSurface: '#0d1c2e', onSurfaceVariant: '#434652',
  outline: '#737784', outlineVariant: '#c3c6d5',
  primary: '#0043a2', onPrimary: '#ffffff', primaryContainer: '#2a5cbe',
  onPrimaryContainer: '#d1dcff', primaryFixed: '#dae2ff',
  secondary: '#6b4ab2', onSecondary: '#ffffff', secondaryContainer: '#b191fd',
  onSecondaryContainer: '#44208a', secondaryFixed: '#eaddff',
  onSecondaryFixed: '#24005b',
  tertiary: '#42495c', error: '#ba1a1a', background: '#f8f9ff',
} as const;

const S = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, gutter: 16, margin: 20 } as const;

// ── Types ──
interface DiaryItem {
  id: number;
  kondisi: string;
  gejala?: string;
  catatan?: string;
  tanggal?: string;
  created_at: string;
}

// ── Helper: Format tanggal ──
const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

// ── Component ──
const DiaryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DiaryItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Fetch diary entries ──
  const fetchDiary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/patient/diary');
      const raw = res.data.data;
      if (Array.isArray(raw)) {
        setEntries(raw);
      } else if (raw?.data && Array.isArray(raw.data)) {
        setEntries(raw.data);
      } else {
        setEntries([]);
      }
    } catch (err: any) {
      console.log('[Diary] Error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchDiary(); }, [fetchDiary]));

  // ── Submit new diary ──
  const handleSubmit = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      Alert.alert('Peringatan', 'Catatan tidak boleh kosong.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/patient/diary', { kondisi: trimmed });
      Alert.alert('Berhasil ✅', 'Catatan harian berhasil disimpan.');
      setInputText('');
      fetchDiary();
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.message || 'Tidak dapat menyimpan catatan.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render diary card ──
  const renderDiaryCard = ({ item }: { item: DiaryItem }) => {
    const dateStr = item.tanggal || item.created_at;
    return (
      <View style={st.diaryCard}>
        <View style={st.diaryCardHeader}>
          <View style={st.diaryDateRow}>
            <View style={st.diaryIconWrap}>
              <MaterialIcons name="event-note" size={18} color={C.primary} />
            </View>
            <View>
              <Text style={st.diaryDate}>{formatDate(dateStr)}</Text>
              {item.created_at && (
                <Text style={st.diaryTime}>{formatTime(item.created_at)}</Text>
              )}
            </View>
          </View>
          <View style={st.diaryDot} />
        </View>
        <View style={st.diaryDivider} />
        <Text style={st.diaryContent}>{item.kondisi || item.catatan || '-'}</Text>
        {item.gejala ? <Text style={st.diaryContent}>Gejala: {item.gejala}</Text> : null}
      </View>
    );
  };

  // ── Loading State ──
  if (loading) {
    return (
      <SafeAreaView style={st.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={st.loadingText}>Memuat catatan harian...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* ═══ TOP APP BAR ═══ */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity style={st.iconBtn} activeOpacity={0.7} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Catatan Harian</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ═══ HERO SECTION ═══ */}
        <View style={st.heroSection}>
          <View style={st.heroIconBox}>
            <MaterialIcons name="auto-stories" size={32} color={C.onPrimary} />
          </View>
          <View style={st.heroTextBlock}>
            <Text style={st.heroTitle}>Catatan Harian</Text>
            <Text style={st.heroSub}>Ceritakan kondisi kesehatan Anda hari ini</Text>
          </View>
        </View>

        {/* ═══ INPUT FORM ═══ */}
        <View style={st.formCard}>
          <View style={st.inputRow}>
            <TextInput
              style={st.textInput}
              placeholder="Bagaimana kondisi Anda hari ini? Ceritakan keluhan, efek samping, atau perasaan Anda..."
              placeholderTextColor={`${C.outline}99`}
              value={inputText}
              onChangeText={setInputText}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>
          <TouchableOpacity
            style={[st.submitBtn, isSaving && st.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            <MaterialIcons name="save" size={20} color={C.onPrimary} />
            <Text style={st.submitBtnText}>
              {isSaving ? 'Menyimpan...' : 'Simpan Catatan'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══ DIARY LIST ═══ */}
        <View style={st.listHeader}>
          <Text style={st.listTitle}>Riwayat Catatan</Text>
          <Text style={st.listCount}>{entries.length} catatan</Text>
        </View>

        {entries.length > 0 ? (
          <FlatList
            data={entries}
            renderItem={renderDiaryCard}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={st.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <ScrollView contentContainerStyle={st.emptyScroll} showsVerticalScrollIndicator={false}>
            <View style={st.emptyState}>
              <View style={st.emptyIconWrap}>
                <MaterialIcons name="note-add" size={48} color={C.outlineVariant} />
              </View>
              <Text style={st.emptyTitle}>Belum ada catatan kesehatan</Text>
              <Text style={st.emptySub}>
                Ceritakan kondisimu hari ini!{'\n'}Catatan Anda membantu tenaga kesehatan memantau perkembangan Anda.
              </Text>
              <View style={st.emptyTip}>
                <MaterialIcons name="lightbulb" size={16} color={C.secondary} />
                <Text style={st.emptyTipText}>
                  Tip: Catat keluhan, efek samping obat, atau perubahan kondisi tubuh Anda.
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ──
const st = StyleSheet.create({
  /* Loading */
  loadingContainer: {
    flex: 1, backgroundColor: C.background,
    justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { marginTop: S.md, fontSize: 16, color: C.outline },

  /* Root */
  safe: { flex: 1, backgroundColor: C.background },

  /* Header */
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: S.margin, paddingVertical: 12,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1d4ed8', letterSpacing: -0.3 },

  /* Hero */
  heroSection: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    paddingHorizontal: S.margin, paddingVertical: S.lg,
    backgroundColor: C.primaryContainer,
  },
  heroIconBox: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTextBlock: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: C.onPrimaryContainer },
  heroSub: { fontSize: 14, color: C.onPrimaryContainer, opacity: 0.85, marginTop: 2 },

  /* Form */
  formCard: {
    marginHorizontal: S.margin, marginTop: -S.sm,
    backgroundColor: C.surfaceContainerLowest, borderRadius: 12,
    padding: S.md, gap: S.md,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#1e3a5f', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  inputRow: {},
  textInput: {
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1, borderColor: C.outlineVariant,
    borderRadius: 10, paddingHorizontal: S.md, paddingVertical: 12,
    fontSize: 15, lineHeight: 22, color: C.onSurface,
    minHeight: 80,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm,
    backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: C.onPrimary },

  /* List Header */
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: S.margin, marginTop: S.lg, marginBottom: S.md,
  },
  listTitle: { fontSize: 20, fontWeight: '600', lineHeight: 28, color: C.onSurface },
  listCount: { fontSize: 12, fontWeight: '500', color: C.outline },

  /* List */
  listContent: { paddingHorizontal: S.margin, paddingBottom: S.xl },

  /* Diary Card */
  diaryCard: {
    backgroundColor: C.surfaceContainerLowest, borderRadius: 12,
    padding: S.md, marginBottom: S.gutter,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  diaryCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  diaryDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diaryIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  diaryDate: { fontSize: 14, fontWeight: '600', color: C.onSurface },
  diaryTime: { fontSize: 11, color: C.outline, marginTop: 1 },
  diaryDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.secondary,
  },
  diaryDivider: {
    height: 1, backgroundColor: `${C.outlineVariant}60`,
    marginVertical: S.sm,
  },
  diaryContent: {
    fontSize: 15, lineHeight: 24, color: C.onSurfaceVariant,
  },

  /* Empty State */
  emptyScroll: { flexGrow: 1 },
  emptyState: {
    alignItems: 'center', paddingVertical: S.xl * 2,
    paddingHorizontal: S.xl, gap: S.md,
  },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: `${C.outlineVariant}40`,
    marginBottom: S.sm,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: C.onSurface, textAlign: 'center' },
  emptySub: {
    fontSize: 15, lineHeight: 24, color: C.onSurfaceVariant,
    textAlign: 'center', maxWidth: 280,
  },
  emptyTip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: S.sm,
    backgroundColor: C.surfaceContainerLow, borderRadius: 12,
    padding: S.md, marginTop: S.sm,
    borderWidth: 1, borderColor: `${C.outlineVariant}4D`,
  },
  emptyTipText: {
    fontSize: 13, lineHeight: 20, color: C.onSurfaceVariant,
    flex: 1,
  },
});

export default DiaryScreen;
