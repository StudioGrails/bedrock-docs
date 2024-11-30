---
mentions:
  - Mirucow
---

<script setup lang="ts">
import list from '../../data/raknet_implementations.json'
</script>

# RakNetの実装リスト

様々な言語でのRakNetの実装リスト。

<table>
  <thead>
    <tr>
      <th>名前</th>
      <th>言語</th>
      <th>スター数</th>
      <th>アクティブな開発</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="item in list">
      <td><a :href="'https://github.com/' + item.repo" target="_blank">{{ item.name }}</a></td>
      <td>{{ item.language }}</td>
      <td>{{ item.stars }}</td>
      <td>{{ item.status == 0 ? '○' : item.status == 1 ? '△' : '✕' }}</td>
    </tr>
  </tbody>
</table>

::: details アクティブな開発
- ○: プロジェクトは活発にメンテナンスされています。 (最終更新が1年以内)
- △: プロジェクトはしばらくメンテナンスされていません。 (最終更新が3年以内)
- ✕: プロジェクトは長い間メンテナンスされていません。 (最終更新が3年以上前)
:::
