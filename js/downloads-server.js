// js/downloads-server.js
// Server-side download functionality

const API_BASE = window.location.origin;

/**
 * Convert blob to base64 string
 */
async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Download a blob to the server
 */
export async function downloadBlobToServer(blob, filename, folder = '') {
    try {
        const base64 = await blobToBase64(blob);
        
        const response = await fetch(`${API_BASE}/api/download/blob`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                blob: base64,
                filename,
                folder
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Download failed');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Server download error:', error);
        throw error;
    }
}

/**
 * Download lyrics to the server
 */
export async function downloadLyricsToServer(content, filename, folder = '') {
    try {
        const response = await fetch(`${API_BASE}/api/download/lyrics`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content,
                filename,
                folder
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Lyrics download failed');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Lyrics save error:', error);
        throw error;
    }
}

/**
 * Download track URL directly on server (bypasses browser)
 */
export async function downloadTrackUrlToServer(url, filename, folder = '') {
    try {
        const response = await fetch(`${API_BASE}/api/download/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                filename,
                folder
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Track download failed');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Track download error:', error);
        throw error;
    }
}

/**
 * Check if server-side downloads are available
 */
export async function checkServerDownloadAvailable() {
    try {
        const response = await fetch(`${API_BASE}/api/config`);
        if (response.ok) {
            const data = await response.json();
            return data.serverDownload === 'enabled';
        }
        return false;
    } catch {
        return false;
    }
}
