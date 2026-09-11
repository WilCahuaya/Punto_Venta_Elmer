import { useEffect, useState } from 'react';
export function useProductImage(relativePath) {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!relativePath) {
                setUrl(null);
                return;
            }
            const result = await window.api.products.imageUrl(relativePath);
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
