<template>
<div class="container">
  <div class="menu">
  <button onclick="toggleMenu()">☰ Menu</button>
  <div class="dropdown" id="dropdownMenu">
    <nuxt-link to="/">Accueil</nuxt-link>
    <nuxt-link to="/reception">Réception</nuxt-link>  
    <nuxt-link to="/room">Room</nuxt-link>
    <nuxt-link to="/gallery">Galerie</nuxt-link>
    <nuxt-link to="/allchat">Tout le chat</nuxt-link>
  </div>
</div>
</div>
</template>
<script>
</script>