<template>
<div>
<div v-for="(m, i) in messages" :key="i" class="card mt-2">
<div><strong>{{ m.author }}</strong> <small>{{ new Date(m.date).toLocaleString() }}</small></div>
<div v-if="(m as any).photo"><img :src="(m as any).photo" style="max-width:240px;"/></div>
<div v-else>{{ m.text }}</div>
</div>
</div>
</template>


<script setup lang="ts">
const props = defineProps<{ messages: Array<any> }>()
</script>