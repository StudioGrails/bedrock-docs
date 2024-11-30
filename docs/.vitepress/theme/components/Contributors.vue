<script setup lang="ts">
import { useData } from 'vitepress';
import { onMounted, ref, watch } from 'vue';

const { frontmatter } = useData();
const contributors = ref<string[]>([]);

watch(
    () => frontmatter.value.mentions,
    (mentions) => {
        if (!mentions) {
            return;
        }
        if (Array.isArray(mentions)) {
            contributors.value = mentions;
        }
    },
    { immediate: true }
)

onMounted(() => {
    if (frontmatter.value.mentions) {
        contributors.value = frontmatter.value.mentions;
    }
});
</script>

<template>
    <div class="contributors">
        <h2>Contributors</h2>
        <div v-if="contributors.length > 0">
            <div class="contributors-list">
                <a
                    v-for="contributor in contributors"
                    :key="contributor"
                    :href="`https://github.com/${contributor}`"
                    target="_blank"
                >
                    <img
                        :src="`https://github.com/${contributor}.png`"
                        :alt="contributor"
                    />
                </a>
            </div>
        </div>
        <div v-else>
            <p>No contributors yet.</p>
        </div>
    </div>
</template>

<style lang="scss">
.contributors {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    border-radius: 8px;
    background-color: var(--vp-c-bg-soft);
}

.contributors h2 {
    width: 100%;
    margin-bottom: 0.8rem;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--vp-c-text-1);
}

.contributors-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
}

.contributors img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    transition: transform 0.3s ease;
}

.contributors img:hover {
    transform: scale(1.1);
}
</style>