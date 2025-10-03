<template>
  <div>
    <!-- Barre de navigation -->
    <nav style="display: flex; gap: 20px; padding: 10px; background: #f3f3f3;">
      <NuxtLink to="/">🏠 Accueil</NuxtLink>
      <NuxtLink to="/camera">📷 Caméra</NuxtLink>
      <NuxtLink to="/profile">👤 Profil</NuxtLink>
      <NuxtLink to="/chat">💬 Chat</NuxtLink>
    </nav>

    <!-- Ici s'affichent les pages -->
    <main style="padding: 20px;">
      <NuxtPage />
    </main>
  </div>
</template>