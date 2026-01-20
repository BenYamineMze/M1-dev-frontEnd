<template>
  <div class="hardware-panel">
    <div class="info-item" v-if="battery">
      <span>🔋 {{ (battery.level * 100).toFixed(0) }}%</span>
      <span v-if="battery.charging" class="charging">⚡</span>
    </div>

    <div class="info-item">
      <button v-if="!coords" @click="getGeo" class="btn-mini">📍 Ma Position</button>
      <span v-else class="geo-text">
        📍 {{ coords.latitude.toFixed(4) }}, {{ coords.longitude.toFixed(4) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// --- BATTERIE ---
const battery = ref<any>(null)

// --- GEO ---
const coords = ref<GeolocationCoordinates | null>(null)

onMounted(async () => {
  // 1. API Batterie
  if ('getBattery' in navigator) {
    try {
      const batt = await (navigator as any).getBattery()
      battery.value = batt
      
      // Mise à jour en temps réel
      batt.addEventListener('levelchange', () => { battery.value = batt })
      batt.addEventListener('chargingchange', () => { battery.value = batt })
    } catch (e) { console.warn('Batterie non supportée') }
  }
})

function getGeo() {
  if (!navigator.geolocation) return alert("Pas de GPS")
  
  navigator.geolocation.getCurrentPosition(
    (pos) => { coords.value = pos.coords },
    (err) => { alert("Impossible de récupérer la position") }
  )
}
</script>

<style scoped>
.hardware-panel {
  display: flex; gap: 10px; justify-content: center;
  font-size: 0.8rem; color: #555; margin-top: 10px;
}
.btn-mini {
  background: #eee; border: none; padding: 2px 8px;
  border-radius: 4px; cursor: pointer; font-size: 0.75rem;
}
.charging { color: #f1c40f; font-weight: bold; }
</style>