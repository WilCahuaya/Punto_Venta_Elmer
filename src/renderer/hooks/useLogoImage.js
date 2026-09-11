import { useEffect, useState } from 'react';
export function useLogoImage(relativePath) {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!relativePath) {
                setUrl(null);
                return;
            }
            const result = await window.api.settings.logoUrl(relativePath);
            if (!cancelled && result.ok)
                setUrl(result.data);
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [relativePath]);
    return url;
}
