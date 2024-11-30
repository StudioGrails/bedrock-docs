<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import Contributors from './Contributors.vue';
import { useData } from 'vitepress';

const { Layout } = DefaultTheme;

const { frontmatter } = useData();
</script>

<template>
    <Layout>
        <
        <template #doc-footer-before>
            <div class="custom-footer">
                <Contributors v-if="frontmatter.show_contributors ?? true" />
            </div>
        </template>
    </Layout>
</template>

<style lang="scss">
.custom-footer {
    margin: 1rem 0;
}
</style>