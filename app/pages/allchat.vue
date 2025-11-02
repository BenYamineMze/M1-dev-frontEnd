<template>
    <div class="container">
    <h1>Tout le chat</h1>
    <div class="chat-box">
      <div class="message">[Général] Salut tout le monde ! 👋</div>
      <div class="message self">[Général] Salut ! Comment ça va ? 😊</div>
      <div class="message">[Développement] N'oubliez pas de push votre code !</div>
      <div class="message self">[Détente] On se retrouve ce soir pour le jeu en ligne ? 🎮</div>
    </div>
  </div>
</template>
<script>
function toggleMenu() {
      const menu = document.getElementById('dropdownMenu');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }

    window.onclick = function(e) {
      if (!e.target.matches('.menu button')) {
        const menu = document.getElementById('dropdownMenu');
        if (menu.style.display === 'block') menu.style.display = 'none';
      }
    }
</script>