const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'screens/nakes/NakesPatientDetailScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// Update tagRow style to use flexWrap and gap instead of marginBottom only
if (content.includes("tagRow: { flexDirection: 'row', marginBottom: 20 }")) {
    content = content.replace(
        "tagRow: { flexDirection: 'row', marginBottom: 20 }",
        "tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }"
    );
}

// Remove marginLeft from the second tag since we use gap now
const oldTagContent = `<TouchableOpacity 
              style={[st.tag, { backgroundColor: '#f1f5f9', marginLeft: 8 }]}
              onPress={() => setShowKepatuhanModal(true)}
            >`;
const newTagContent = `<TouchableOpacity 
              style={[st.tag, { backgroundColor: '#f1f5f9' }]}
              onPress={() => setShowKepatuhanModal(true)}
            >`;

if (content.includes(oldTagContent)) {
    content = content.replace(oldTagContent, newTagContent);
}

// Ensure the first tag can shrink
const oldFirstTag = `<View style={[st.tag, { backgroundColor: '#dcfce7' }]}>
              <MaterialIcons name="verified-user" size={14} color="#16a34a" />
              <Text style={[st.tagText, { color: '#16a34a' }]}>Status Kepatuhan: {patient.status_kepatuhan?.toUpperCase()}</Text>
            </View>`;
const newFirstTag = `<View style={[st.tag, { backgroundColor: '#dcfce7', flexShrink: 1 }]}>
              <MaterialIcons name="verified-user" size={14} color="#16a34a" />
              <Text style={[st.tagText, { color: '#16a34a', flexShrink: 1 }]} numberOfLines={1}>Status Kepatuhan: {patient.status_kepatuhan?.toUpperCase()}</Text>
            </View>`;

if (content.includes(oldFirstTag)) {
    content = content.replace(oldFirstTag, newFirstTag);
}

fs.writeFileSync(file, content);
console.log('Successfully updated NakesPatientDetailScreen.tsx');
