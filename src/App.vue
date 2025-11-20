<template>
  <div id="app">
    <TrafficVideoDetector />
  </div>
</template>

<script setup>
import TrafficVideoDetector from './components/TrafficVideoDetector.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #0f172a;
  color: #e2e8f0;
}

#app {
  min-height: 100vh;
}
</style>