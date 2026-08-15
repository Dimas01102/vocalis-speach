export async function loadEnv(path = './.env') {
    try {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) return {};

        const text = await res.text();
        const env = {};

        text.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            const idx = trimmed.indexOf('=');
            if (idx === -1) return;

            const key = trimmed.slice(0, idx).trim();
            let value = trimmed.slice(idx + 1).trim();

            if (value.length >= 2) {
                const first = value[0];
                const last = value[value.length - 1];
                if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
                    value = value.slice(1, -1);
                }
            }

            if (key) env[key] = value;
        });

        return env;
    } catch (e) {

        return {};
    }
}