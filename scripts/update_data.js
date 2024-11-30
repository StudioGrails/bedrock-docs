import * as fs from 'fs';
import fetch from 'node-fetch';

const token = process.env.GITHUB_TOKEN;

if (!token) {
  throw new Error('GITHUB_TOKEN is not set in the environment variables.');
}

const dataDir = './data';

async function updateData() {
  const raknetImplementationsPath = `${dataDir}/raknet_implementations.json`;

  const raknetImplementations = JSON.parse(fs.readFileSync(raknetImplementationsPath, 'utf-8'));

  const updatedRaknetImplementations = await updateRaknetImplementations(raknetImplementations);

  fs.writeFileSync(raknetImplementationsPath, JSON.stringify(updatedRaknetImplementations, null, 2));
}

async function updateRaknetImplementations(data) {
  let now = new Date().getTime();

  for (const impl of data) {
    const res = await fetch(
      `https://api.github.com/repos/${impl.repo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!res.ok) {
      console.error(`Failed to fetch data for ${impl.repo}`);
      continue;
    }

    const implData = await res.json();
    impl.stars = implData.stargazers_count;

    const lastPushed = new Date(implData.pushed_at).getTime();
    const diff = now - lastPushed;

    if (diff < 1000 * 60 * 60 * 24 * 30 * 12) {
      impl.status = 0;
    } else {
      if (diff < 1000 * 60 * 60 * 24 * 30 * 36) {
        impl.status = 1;
      } else {
        impl.status = 2;
      }
    }
  }

  return data;
}

updateData().catch((error) => {
  console.error('Error updating data:', error);
  process.exit(1);
});