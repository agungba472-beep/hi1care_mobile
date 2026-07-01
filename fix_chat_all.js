const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'screens/patient/PatientChatRoomScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Fix SafeAreaView import
content = content.replace(
  /import {([^}]+)SafeAreaView,([^}]+)} from 'react-native';/,
  "import {$1$2} from 'react-native';\nimport { SafeAreaView } from 'react-native-safe-area-context';"
);
content = content.replace(
  /import {([^}]+), SafeAreaView([^}]+)} from 'react-native';/,
  "import {$1$2} from 'react-native';\nimport { SafeAreaView } from 'react-native-safe-area-context';"
);

// 2. Add chatStatus state
if (!content.includes('const [chatStatus, setChatStatus]')) {
  content = content.replace(
    /const \[chatKategori, setChatKategori\] = useState<string>\('booking'\);/,
    "const [chatKategori, setChatKategori] = useState<string>('booking');\n  const [chatStatus, setChatStatus] = useState<string>('aktif');"
  );
}

// 3. Set chatStatus in fetchMessages
if (!content.includes('setChatStatus(data.status ||')) {
  content = content.replace(
    /setChatKategori\(data\.kategori \|\| 'booking'\);/,
    "setChatKategori(data.kategori || 'booking');\n        setChatStatus(data.status || 'aktif');"
  );
}

// 4. Update Header Layout and conditional Selesai button
const oldHeader = `{/* HEADER DINAMIS */}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={st.headerName}>{opponentName}</Text>
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
        {myRole === 'nakes' && (
          <TouchableOpacity onPress={handleFinishConsultation} style={st.finishBtn}>
            <MaterialIcons name="check-circle" size={20} color="#10b981" />
            <Text style={st.finishBtnText}>Selesai</Text>
          </TouchableOpacity>
        )}`;

const newHeader = `{/* HEADER DINAMIS */}
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
        )}`;

if (content.includes(oldHeader)) {
    content = content.replace(oldHeader, newHeader);
}

fs.writeFileSync(file, content);
console.log('Successfully updated PatientChatRoomScreen.tsx completely');
