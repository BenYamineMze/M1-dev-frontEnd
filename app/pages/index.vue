<template>
  <div class="home-container">
    
    <div class="hero">
      <div class="logo-circle">💬</div>
      <h1>Chat PWA</h1>
      <p class="tagline">Discutez en temps réel, même hors ligne.</p>
    </div>

    <div class="action-area">
      <NuxtLink to="/reception" class="btn-start">
        Commencer l'expérience 🚀
      </NuxtLink>
    </div>

    <div class="tech-section">
      <h2>⚡ Technologies & Architecture</h2>
      <p class="tech-intro">Projet réalisé avec la stack moderne Vue/Nuxt.</p>
      
      <div class="tech-grid">
        <div class="tech-card">
          <span class="icon">💚</span>
          <h3>Nuxt 4</h3>
          <p>Framework Vue.js pour le rendu et le routing.</p>
        </div>

        <div class="tech-card">
          <span class="icon">📱</span>
          <h3>Vite PWA</h3>
          <p>Service Worker, Manifeste et fonctionnement Offline.</p>
        </div>

        <div class="tech-card">
          <span class="icon">🍍</span>
          <h3>Pinia</h3>
          <p>Gestion d'état global et persistance des données.</p>
        </div>

        <div class="tech-card">
          <span class="icon">🔌</span>
          <h3>Socket.IO</h3>
          <p>Communication bidirectionnelle temps réel.</p>
        </div>

        <div class="tech-card">
          <span class="icon">📸</span>
          <h3>Web APIs</h3>
          <p>Accès natif Caméra, Vibration et Notifications.</p>
        </div>
      </div>
    </div>

    <footer class="footer">
      <p>TP PWA - Année 2024/2025</p>
    </footer>

  </div>
</template>

<script setup lang="ts">
// page de présentation
</script>

<style scoped>
/* --- LAYOUT --- */
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f2f5 0%, #ffffff 100%);
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #333;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* --- HERO --- */
.hero {
  text-align: center;
  margin-bottom: 40px;
}

.logo-circle {
  width: 80px;
  height: 80px;
  background: #2563eb;
  color: white;
  font-size: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px auto;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
}

h1 {
  font-size: 2.5rem;
  margin: 0 0 10px 0;
  color: #111;
  font-weight: 800;
  letter-spacing: -1px;
}

.tagline {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

/* --- CTA BUTTON --- */
.action-area {
  width: 100%;
  max-width: 400px;
  margin-bottom: 50px;
}

.btn-start {
  display: block;
  width: 100%;
  padding: 18px;
  background: #2563eb;
  color: white;
  text-align: center;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
  transition: transform 0.2s, background 0.2s;
}

.btn-start:active {
  transform: scale(0.98);
  background: #1d4ed8;
}

/* --- TECH GRID --- */
.tech-section {
  width: 100%;
  max-width: 600px;
}

.tech-section h2 {
  font-size: 1.2rem;
  margin-bottom: 5px;
  color: #333;
}
.tech-intro {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsive */
  gap: 15px;
}

.tech-card {
  background: white;
  padding: 15px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tech-card .icon {
  font-size: 1.5rem;
  margin-bottom: 5px;
}

.tech-card h3 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.tech-card p {
  margin: 0;
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
}

/* --- FOOTER --- */
.footer {
  margin-top: auto;
  padding-top: 40px;
  color: #aaa;
  font-size: 0.8rem;
}
</style>